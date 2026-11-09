package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Data structures matching the Rust server
type PokedexEntry struct {
	Name string `json:"name" bson:"name"`
	ID   int64  `json:"id" bson:"id"`
}

type PokemonAbility struct {
	Name        string `json:"name" bson:"name"`
	FlavourText string `json:"flavour_text" bson:"flavour_text"`
	Effect      string `json:"effect" bson:"effect"`
}

type PokeboxEntry struct {
	Name string `json:"name" bson:"name"`
	ID   int64  `json:"id" bson:"id"`
	// FormName is the English form name ("Alolan Form"), or "" when the form has none.
	FormName string `json:"form_name" bson:"form_name"`
	// SpeciesDescription is the form's own English flavour text if it has one, else the species'.
	SpeciesDescription string           `json:"species_description" bson:"species_description"`
	Types              []string         `json:"types" bson:"types"`
	Abilities          []PokemonAbility `json:"abilities" bson:"abilities"`
	// Sprites is the raw PokeAPI sprites object (including "other", "versions", etc.),
	// matching rust-server which stores and returns it untouched.
	Sprites bson.M `json:"sprites" bson:"sprites"`
	// Varieties are the species' other forms, never this one.
	Varieties []PokemonVariety `json:"varieties" bson:"varieties"`
}

// PokemonVariety is another form of the same species, complete so clients can
// switch to it without another request.
type PokemonVariety struct {
	Name               string           `json:"name" bson:"name"`
	ID                 int64            `json:"id" bson:"id"`
	FormName           string           `json:"form_name" bson:"form_name"`
	IsDefault          bool             `json:"is_default" bson:"is_default"`
	SpeciesDescription string           `json:"species_description" bson:"species_description"`
	Types              []string         `json:"types" bson:"types"`
	Abilities          []PokemonAbility `json:"abilities" bson:"abilities"`
	Sprites            bson.M           `json:"sprites" bson:"sprites"`
}

// Why a lookup failed. Handlers map these to the same statuses as rust-server:
// ErrNotFound -> 404, ErrUpstream -> 502, anything else (ErrDb) -> 500.
var (
	// The Pokémon doesn't exist: PokeAPI answered 404.
	ErrNotFound = errors.New("pokemon not found")
	// PokeAPI was unreachable, failed, or sent something unexpected.
	ErrUpstream = errors.New("pokeapi error")
	// MongoDB failed.
	ErrDb = errors.New("database error")
)

func upstreamErr(format string, args ...any) error {
	return fmt.Errorf("%w: %s", ErrUpstream, fmt.Sprintf(format, args...))
}

func dbErr(err error) error {
	return fmt.Errorf("%w: %v", ErrDb, err)
}

// statusFor is the HTTP status for a lookup error.
func statusFor(err error) int {
	switch {
	case errors.Is(err, ErrNotFound):
		return http.StatusNotFound
	case errors.Is(err, ErrUpstream):
		return http.StatusBadGateway
	default:
		return http.StatusInternalServerError
	}
}

const pokeAPIURL = "https://pokeapi.co/api/v2"

// Database interface
type PokeboxDb interface {
	GetPokedex() ([]PokedexEntry, error)
	GetPokemonByID(id int64) (PokeboxEntry, error)
	GetPokemonByIdentifier(identifier string) (PokeboxEntry, error)
	StorePokemon(pokemon *PokeboxEntry) error
}

type MongoDb struct {
	client *mongo.Client
	api    pokeAPI
}

func (db *MongoDb) GetPokedex() ([]PokedexEntry, error) {
	collection := db.client.Database("pokemon").Collection("pokemon")
	cursor, err := collection.Find(context.Background(), bson.M{"id": bson.M{"$exists": true}}, options.Find().SetProjection(bson.M{"_id": 0, "id": 1, "name": 1}).SetSort(bson.M{"id": 1}))
	if err != nil {
		return nil, dbErr(err)
	}
	defer cursor.Close(context.Background())

	pokedex := []PokedexEntry{}
	if err = cursor.All(context.Background(), &pokedex); err != nil {
		return nil, dbErr(err)
	}
	return pokedex, nil
}

func (db *MongoDb) GetPokemonByID(id int64) (PokeboxEntry, error) {
	return db.getPokemon(bson.M{"id": id}, fmt.Sprintf("%d", id))
}

// storedFilter is filter limited to entries stored with varieties. Entries
// stored before varieties existed don't match, so they're refetched and
// replaced.
func storedFilter(filter bson.M) bson.M {
	limited := bson.M{"varieties": bson.M{"$exists": true}}
	for k, v := range filter {
		limited[k] = v
	}
	return limited
}

// getPokemon returns the stored Pokémon matching filter, or fetches, stores
// and returns it from PokeAPI when it isn't stored yet.
func (db *MongoDb) getPokemon(filter bson.M, identifier string) (PokeboxEntry, error) {
	collection := db.client.Database("pokemon").Collection("pokemon")

	var pokemon PokeboxEntry
	err := collection.FindOne(context.Background(), storedFilter(filter), options.FindOne().SetProjection(bson.M{"_id": 0})).Decode(&pokemon)
	switch {
	case err == nil:
		return pokemon, nil
	case errors.Is(err, mongo.ErrNoDocuments):
		return db.fetchAndStorePokemon(identifier)
	default:
		return PokeboxEntry{}, dbErr(err)
	}
}

func (db *MongoDb) GetPokemonByIdentifier(identifier string) (PokeboxEntry, error) {
	if id, err := strconv.ParseInt(identifier, 10, 64); err == nil {
		return db.GetPokemonByID(id)
	}
	return db.getPokemon(bson.M{"name": identifier}, identifier)
}

func (db *MongoDb) fetchAndStorePokemon(identifier string) (PokeboxEntry, error) {
	pokeboxEntry, err := db.api.fetchEntry(identifier)
	if err != nil {
		return PokeboxEntry{}, err
	}
	// The lookup still succeeded, so a failed store only costs a refetch next time.
	if err := db.StorePokemon(&pokeboxEntry); err != nil {
		log.Printf("Failed to store pokemon %s: %v", identifier, err)
	}
	return pokeboxEntry, nil
}

// StorePokemon upserts by id, so storing the same Pokémon twice (e.g. two
// concurrent first lookups) keeps one copy, like rust-server.
func (db *MongoDb) StorePokemon(pokemon *PokeboxEntry) error {
	collection := db.client.Database("pokemon").Collection("pokemon")
	_, err := collection.ReplaceOne(context.Background(), bson.M{"id": pokemon.ID}, pokemon, options.Replace().SetUpsert(true))
	return err
}

// ensureIndexes adds rust-server's unique index on id, so concurrent first
// lookups of the same Pokémon can't store it twice. Failing to create it
// (MongoDB not up yet, or duplicates already stored) is logged, not fatal.
func ensureIndexes(client *mongo.Client) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := client.Database("pokemon").Collection("pokemon").Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "id", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		fmt.Printf("WARNING: could not create the unique index on pokemon.id (%v). If duplicates are already stored, remove them and restart.\n", err)
	}
}

// pokeAPI fetches from PokeAPI at baseURL (a fake server in tests). Every
// resource is fetched directly, like rust-server: PokeGo doesn't expose the
// status code (so a 404 couldn't be told apart from an outage), its model
// drops sprite fields the clients use, and it has no pokemon-form flavour text.
type pokeAPI struct {
	baseURL string
}

// The parts of PokeAPI's resources the Pokébox reads.
type (
	namedRef struct {
		Name string `json:"name"`
	}
	localizedName struct {
		Name     string   `json:"name"`
		Language namedRef `json:"language"`
	}
	localizedFlavor struct {
		FlavorText string   `json:"flavor_text"`
		Language   namedRef `json:"language"`
	}
	apiPokemon struct {
		ID        int64      `json:"id"`
		Name      string     `json:"name"`
		IsDefault bool       `json:"is_default"`
		Species   namedRef   `json:"species"`
		Forms     []namedRef `json:"forms"`
		Abilities []struct {
			Ability namedRef `json:"ability"`
		} `json:"abilities"`
		Types []struct {
			Type namedRef `json:"type"`
		} `json:"types"`
		Sprites bson.M `json:"sprites"`
	}
	apiSpecies struct {
		FlavorTextEntries []localizedFlavor `json:"flavor_text_entries"`
		Varieties         []struct {
			IsDefault bool     `json:"is_default"`
			Pokemon   namedRef `json:"pokemon"`
		} `json:"varieties"`
	}
	apiAbility struct {
		Name              string            `json:"name"`
		FlavorTextEntries []localizedFlavor `json:"flavor_text_entries"`
		EffectEntries     []struct {
			ShortEffect string   `json:"short_effect"`
			Language    namedRef `json:"language"`
		} `json:"effect_entries"`
	}
	apiForm struct {
		FormNames         []localizedName   `json:"form_names"`
		FlavorTextEntries []localizedFlavor `json:"flavor_text_entries"`
	}
)

// fetchedPokemon is one pokemon resource and what it needs besides the
// species: its abilities (in order, minus any that failed to fetch) and its
// first pokemon-form.
type fetchedPokemon struct {
	Pokemon   apiPokemon
	Abilities []apiAbility
	Form      apiForm
}

// getJSON decodes baseURL/path into out. PokeAPI's 404 is ErrNotFound; any
// other failure is ErrUpstream.
func (api pokeAPI) getJSON(path string, out any) error {
	resp, err := http.Get(fmt.Sprintf("%s/%s", api.baseURL, path))
	if err != nil {
		return upstreamErr("failed to fetch %s: %v", path, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return fmt.Errorf("%w: %s", ErrNotFound, path)
	}
	if resp.StatusCode != http.StatusOK {
		return upstreamErr("%s: unexpected status %d", path, resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return upstreamErr("failed to read %s: %v", path, err)
	}
	if err := json.Unmarshal(body, out); err != nil {
		return upstreamErr("failed to decode %s: %v", path, err)
	}
	return nil
}

// fetchPokemon gets /pokemon/{identifier} with its abilities and form text.
func (api pokeAPI) fetchPokemon(identifier string) (fetchedPokemon, error) {
	var fetched fetchedPokemon
	if err := api.getJSON("pokemon/"+identifier, &fetched.Pokemon); err != nil {
		return fetched, err
	}
	if fetched.Pokemon.Sprites == nil {
		fetched.Pokemon.Sprites = bson.M{"front_default": nil}
	}

	var wg sync.WaitGroup
	abilities := make([]*apiAbility, len(fetched.Pokemon.Abilities))
	for i, ref := range fetched.Pokemon.Abilities {
		wg.Add(1)
		go func() {
			defer wg.Done()
			var ability apiAbility
			// Like rust-server, abilities that fail to load are skipped.
			if err := api.getJSON("ability/"+ref.Ability.Name, &ability); err != nil {
				log.Printf("Failed to fetch ability %s: %v", ref.Ability.Name, err)
				return
			}
			abilities[i] = &ability
		}()
	}
	var formErr error
	if len(fetched.Pokemon.Forms) > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			// A missing form just means no form text.
			if err := api.getJSON("pokemon-form/"+fetched.Pokemon.Forms[0].Name, &fetched.Form); err != nil && !errors.Is(err, ErrNotFound) {
				formErr = err
			}
		}()
	}
	wg.Wait()
	if formErr != nil {
		return fetched, formErr
	}
	for _, ability := range abilities {
		if ability != nil {
			fetched.Abilities = append(fetched.Abilities, *ability)
		}
	}
	return fetched, nil
}

// fetchEntry builds the full Pokébox entry for identifier, including every
// other variety of its species.
func (api pokeAPI) fetchEntry(identifier string) (PokeboxEntry, error) {
	main, err := api.fetchPokemon(identifier)
	if err != nil {
		return PokeboxEntry{}, err
	}
	// By species name, as the identifier may be a form like "deoxys-normal".
	var species apiSpecies
	if err := api.getJSON("pokemon-species/"+main.Pokemon.Species.Name, &species); err != nil {
		// Only the Pokémon itself can be missing; a missing species is PokeAPI misbehaving.
		return PokeboxEntry{}, upstreamErr("species %s: %v", main.Pokemon.Species.Name, err)
	}

	var names []string
	for _, v := range species.Varieties {
		if v.Pokemon.Name != main.Pokemon.Name {
			names = append(names, v.Pokemon.Name)
		}
	}
	fetched := make([]fetchedPokemon, len(names))
	errs := make([]error, len(names))
	var wg sync.WaitGroup
	for i, name := range names {
		wg.Add(1)
		go func() {
			defer wg.Done()
			fetched[i], errs[i] = api.fetchPokemon(name)
		}()
	}
	wg.Wait()

	// A variety PokeAPI doesn't have is skipped; any other failure fails the
	// lookup, so an entry missing forms is never stored.
	var varieties []fetchedPokemon
	for i, err := range errs {
		switch {
		case err == nil:
			varieties = append(varieties, fetched[i])
		case errors.Is(err, ErrNotFound):
			log.Printf("Variety %s not found, skipping it", names[i])
		default:
			return PokeboxEntry{}, err
		}
	}
	return toPokeboxEntry(main, species, varieties), nil
}

// english is the first entry of entries whose language is English.
func english[T any](entries []T, language func(T) string) (T, bool) {
	for _, e := range entries {
		if language(e) == "en" {
			return e, true
		}
	}
	var zero T
	return zero, false
}

// toPokeboxEntry turns the PokeAPI responses for one Pokémon into what the
// Pokébox stores and serves, matching rust-server's to_pokebox_entry.
// varieties are the species' other forms in any order; they come out in the
// species' order.
func toPokeboxEntry(main fetchedPokemon, species apiSpecies, varieties []fetchedPokemon) PokeboxEntry {
	speciesText := "No description available"
	if e, ok := english(species.FlavorTextEntries, func(e localizedFlavor) string { return e.Language.Name }); ok {
		speciesText = e.FlavorText
	}

	entry := toForm(main, speciesText)
	entry.Varieties = []PokemonVariety{}
	for _, v := range species.Varieties {
		for _, f := range varieties {
			if f.Pokemon.Name != v.Pokemon.Name {
				continue
			}
			form := toForm(f, speciesText)
			entry.Varieties = append(entry.Varieties, PokemonVariety{
				Name:               form.Name,
				ID:                 form.ID,
				FormName:           form.FormName,
				IsDefault:          v.IsDefault,
				SpeciesDescription: form.SpeciesDescription,
				Types:              form.Types,
				Abilities:          form.Abilities,
				Sprites:            form.Sprites,
			})
		}
	}
	return entry
}

// toForm maps one fetched pokemon (without varieties), describing it by its
// form's own English flavour text, or speciesText when the form has none.
func toForm(f fetchedPokemon, speciesText string) PokeboxEntry {
	byLanguage := func(e localizedFlavor) string { return e.Language.Name }

	formName := ""
	if n, ok := english(f.Form.FormNames, func(n localizedName) string { return n.Language.Name }); ok {
		formName = n.Name
	}
	description := speciesText
	if e, ok := english(f.Form.FlavorTextEntries, byLanguage); ok {
		description = e.FlavorText
	}

	abilities := []PokemonAbility{}
	for _, a := range f.Abilities {
		ability := PokemonAbility{Name: a.Name, FlavourText: "No description available", Effect: "No effect available"}
		if e, ok := english(a.FlavorTextEntries, byLanguage); ok {
			ability.FlavourText = e.FlavorText
		}
		for _, e := range a.EffectEntries {
			if e.Language.Name == "en" {
				ability.Effect = e.ShortEffect
				break
			}
		}
		abilities = append(abilities, ability)
	}

	types := []string{}
	for _, t := range f.Pokemon.Types {
		types = append(types, t.Type.Name)
	}

	return PokeboxEntry{
		ID:                 f.Pokemon.ID,
		Name:               f.Pokemon.Name,
		FormName:           formName,
		SpeciesDescription: description,
		Types:              types,
		Abilities:          abilities,
		Sprites:            f.Pokemon.Sprites,
	}
}

// maxPokemonID is the highest national dex number random-new picks from.
const maxPokemonID = 1025

// maxIdentifierLen is the longest id or name /pokemon/:identifier accepts.
// Real names top out around 25 characters.
const maxIdentifierLen = 64

// normalizeIdentifier returns the path parameter decoded and lowercased, and
// whether it can name a Pokémon: 1 to maxIdentifierLen of a-z, 0-9 and '-'.
// Anything else can't exist, so it's answered 404 without asking PokeAPI
// (which rejects odd names with a 403 that would otherwise surface as a 502,
// and turns "/pokemon/.." into its index page).
func normalizeIdentifier(raw string) (string, bool) {
	decoded, err := url.PathUnescape(raw)
	if err != nil {
		return "", false
	}
	key := strings.ToLower(strings.TrimSpace(decoded))
	if key == "" || len(key) > maxIdentifierLen {
		return "", false
	}
	for _, r := range key {
		if !(r >= 'a' && r <= 'z' || r >= '0' && r <= '9' || r == '-') {
			return "", false
		}
	}
	return key, true
}

// pickUncaughtID returns a random id in 1..=maxPokemonID that isn't in
// caught, or false once every Pokémon has been caught.
func pickUncaughtID(caught []int64) (int64, bool) {
	seen := make(map[int64]bool, len(caught))
	for _, id := range caught {
		seen[id] = true
	}
	uncaught := make([]int64, 0, maxPokemonID)
	for id := int64(1); id <= maxPokemonID; id++ {
		if !seen[id] {
			uncaught = append(uncaught, id)
		}
	}
	if len(uncaught) == 0 {
		return 0, false
	}
	return uncaught[rand.Intn(len(uncaught))], true
}

func createDb() (PokeboxDb, error) {
	uri := os.Getenv("MONGODB_URI")
	if uri == "" {
		uri = "mongodb://admin:testtest@localhost:27017/?authSource=admin"
	}

	fmt.Printf("Connecting to MongoDB at: %s\n", uri)
	// Decode nested documents (e.g. sprites.other.home) as maps so they serialise to plain JSON objects
	// Fail queries after 5s when MongoDB is unreachable, so the request answers
	// 500 well inside Echo's write timeout. Same value in every server.
	clientOptions := options.Client().ApplyURI(uri).
		SetBSONOptions(&options.BSONOptions{DefaultDocumentM: true}).
		SetServerSelectionTimeout(5 * time.Second)
	client, err := mongo.Connect(context.Background(), clientOptions)
	if err != nil {
		return nil, err
	}

	// Like rust-server, start anyway when MongoDB isn't up yet: requests fail
	// with 500 until it is, rather than being served from fake data.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := client.Ping(ctx, nil); err != nil {
		fmt.Printf("WARNING: could not reach MongoDB yet: %v\n", err)
	} else {
		fmt.Println("Connected to MongoDB successfully")
		ensureIndexes(client)
	}
	return &MongoDb{client: client, api: pokeAPI{baseURL: pokeAPIURL}}, nil
}

// corsHeaders mirrors the CORS fairing in rust-server: the same static headers on every response.
var corsHeaders = map[string]string{
	"Access-Control-Allow-Origin":      "*",
	"Access-Control-Allow-Methods":     "POST, PATCH, GET, DELETE, OPTIONS",
	"Access-Control-Allow-Headers":     "*",
	"Access-Control-Allow-Credentials": "true",
}

func cors(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c *echo.Context) error {
		for name, value := range corsHeaders {
			c.Response().Header().Set(name, value)
		}
		return next(c)
	}
}

// errorResponse logs err (unless it's a plain not-found) and answers with its status.
func errorResponse(c *echo.Context, msg string, err error) error {
	status := statusFor(err)
	if status != http.StatusNotFound {
		log.Printf("%s: %v", msg, err)
	}
	return c.String(status, http.StatusText(status))
}

// newServer builds the HTTP API, matching the routes and status codes of rust-server.
func newServer(db PokeboxDb) *echo.Echo {
	e := echo.New()
	e.Use(middleware.RequestLogger())
	e.Use(cors)

	e.GET("/", func(c *echo.Context) error {
		return c.String(http.StatusOK, "Hello, World!")
	})
	e.GET("/pokemon/random-new", func(c *echo.Context) error {
		pokedex, err := db.GetPokedex()
		if err != nil {
			return errorResponse(c, "Failed to get pokedex", err)
		}

		usedIDs := make([]int64, 0, len(pokedex))
		for _, entry := range pokedex {
			usedIDs = append(usedIDs, entry.ID)
		}

		id, ok := pickUncaughtID(usedIDs)
		if !ok {
			return c.String(http.StatusNotFound, http.StatusText(http.StatusNotFound))
		}
		pokemon, err := db.GetPokemonByID(id)
		if err != nil {
			return errorResponse(c, "Failed to get random new pokemon", err)
		}

		return c.JSON(http.StatusOK, pokemon)
	})
	e.GET("/pokemon/:identifier", func(c *echo.Context) error {
		identifier, ok := normalizeIdentifier(c.Param("identifier"))
		if !ok {
			return c.String(http.StatusNotFound, http.StatusText(http.StatusNotFound))
		}

		pokemon, err := db.GetPokemonByIdentifier(identifier)
		if err != nil {
			return errorResponse(c, "Failed to get pokemon "+identifier, err)
		}

		return c.JSON(http.StatusOK, pokemon)
	})
	e.GET("/pokedex", func(c *echo.Context) error {
		pokedex, err := db.GetPokedex()
		if err != nil {
			return errorResponse(c, "Failed to get pokedex", err)
		}

		return c.JSON(http.StatusOK, pokedex)
	})
	e.OPTIONS("/*", func(c *echo.Context) error {
		return c.NoContent(http.StatusNoContent)
	})

	return e
}

func main() {
	db, err := createDb()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	e := newServer(db)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	fmt.Println("Starting server on :" + port)
	if err := e.Start(":" + port); err != nil {
		e.Logger.Error("failed to start server", "error", err)
	}
}
