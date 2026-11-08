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
	"os"
	"strconv"
	"time"

	pokego "github.com/JoshGuarino/PokeGo/pkg"
	"github.com/JoshGuarino/PokeGo/pkg/models"
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
	Name               string           `json:"name" bson:"name"`
	ID                 int64            `json:"id" bson:"id"`
	SpeciesDescription string           `json:"species_description" bson:"species_description"`
	Types              []string         `json:"types" bson:"types"`
	Abilities          []PokemonAbility `json:"abilities" bson:"abilities"`
	// Sprites is the raw PokeAPI sprites object (including "other", "versions", etc.),
	// matching rust-server which stores and returns it untouched.
	Sprites bson.M `json:"sprites" bson:"sprites"`
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

// getPokemon returns the stored Pokémon matching filter, or fetches, stores
// and returns it from PokeAPI when it isn't stored yet.
func (db *MongoDb) getPokemon(filter bson.M, identifier string) (PokeboxEntry, error) {
	collection := db.client.Database("pokemon").Collection("pokemon")

	var pokemon PokeboxEntry
	err := collection.FindOne(context.Background(), filter, options.FindOne().SetProjection(bson.M{"_id": 0})).Decode(&pokemon)
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
	client := pokego.NewClient()

	// Get basic Pokemon data, plus the raw sprites object that PokeGo's model trims
	pokemonData, sprites, err := fetchPokemon(identifier)
	if err != nil {
		return PokeboxEntry{}, err
	}

	// Get species data for description (by species name, as the identifier may be a form like "deoxys-normal")
	speciesData, err := client.Pokemon.GetPokemonSpecies(pokemonData.Species.Name)
	if err != nil {
		return PokeboxEntry{}, upstreamErr("failed to fetch pokemon species %s: %v", pokemonData.Species.Name, err)
	}

	// Get abilities
	abilities := []PokemonAbility{}
	for _, abilityRef := range pokemonData.Abilities {
		abilityData, err := client.Pokemon.GetAbility(abilityRef.Ability.Name)
		if err != nil {
			continue // Skip if we can't get ability data
		}

		// Find English flavor text
		flavorText := "No description available"
		for _, entry := range abilityData.FlavorTextEntries {
			if entry.Language.Name == "en" {
				flavorText = entry.FlavorText
				break
			}
		}

		// Find English effect
		effect := "No effect available"
		for _, entry := range abilityData.EffectEntries {
			if entry.Language.Name == "en" {
				effect = entry.ShortEffect
				break
			}
		}

		abilities = append(abilities, PokemonAbility{
			Name:        abilityData.Name,
			FlavourText: flavorText,
			Effect:      effect,
		})
	}

	// Extract types
	types := []string{}
	for _, typeRef := range pokemonData.Types {
		types = append(types, typeRef.Type.Name)
	}

	// Get species description
	description := "No description available"
	for _, entry := range speciesData.FlavorTextEntries {
		if entry.Language.Name == "en" {
			description = entry.FlavorText
			break
		}
	}

	pokeboxEntry := PokeboxEntry{
		ID:                 int64(pokemonData.ID),
		Name:               pokemonData.Name,
		SpeciesDescription: description,
		Types:              types,
		Abilities:          abilities,
		Sprites:            sprites,
	}

	// Store in database
	if err := db.StorePokemon(&pokeboxEntry); err != nil {
		log.Printf("Failed to store pokemon %s: %v", identifier, err)
	}

	return pokeboxEntry, nil
}

func (db *MongoDb) StorePokemon(pokemon *PokeboxEntry) error {
	collection := db.client.Database("pokemon").Collection("pokemon")
	_, err := collection.InsertOne(context.Background(), pokemon)
	return err
}

// fetchPokemon gets /pokemon/{identifier} straight from PokeAPI, like
// rust-server does: PokeGo doesn't expose the status code, so a 404 couldn't
// be told apart from an outage, and its model drops sprite fields the clients
// use. Returns the decoded Pokémon and its untouched "sprites" object.
func fetchPokemon(identifier string) (models.Pokemon, bson.M, error) {
	return fetchPokemonFrom(pokeAPIURL, identifier)
}

func fetchPokemonFrom(baseURL, identifier string) (models.Pokemon, bson.M, error) {
	var pokemon models.Pokemon
	resp, err := http.Get(fmt.Sprintf("%s/pokemon/%s", baseURL, identifier))
	if err != nil {
		return pokemon, nil, upstreamErr("failed to fetch pokemon %s: %v", identifier, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return pokemon, nil, fmt.Errorf("%w: %s", ErrNotFound, identifier)
	}
	if resp.StatusCode != http.StatusOK {
		return pokemon, nil, upstreamErr("pokemon %s: unexpected status %d", identifier, resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return pokemon, nil, upstreamErr("failed to read pokemon %s: %v", identifier, err)
	}
	if err := json.Unmarshal(body, &pokemon); err != nil {
		return pokemon, nil, upstreamErr("failed to decode pokemon %s: %v", identifier, err)
	}
	var raw struct {
		Sprites bson.M `json:"sprites"`
	}
	if err := json.Unmarshal(body, &raw); err != nil || raw.Sprites == nil {
		raw.Sprites = toBsonM(pokemon.Sprites)
	}
	return pokemon, raw.Sprites, nil
}

// toBsonM round-trips a value through JSON to get a generic map.
func toBsonM(v any) bson.M {
	m := bson.M{}
	if b, err := json.Marshal(v); err == nil {
		_ = json.Unmarshal(b, &m)
	}
	return m
}

// maxPokemonID is the highest national dex number random-new picks from.
const maxPokemonID = 1025

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
	}
	return &MongoDb{client: client}, nil
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
		identifier := c.Param("identifier")

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
