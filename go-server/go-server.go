package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"time"

	pokego "github.com/JoshGuarino/PokeGo/pkg"
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
		return nil, err
	}
	defer cursor.Close(context.Background())

	pokedex := []PokedexEntry{}
	if err = cursor.All(context.Background(), &pokedex); err != nil {
		return nil, err
	}
	return pokedex, nil
}

func (db *MongoDb) GetPokemonByID(id int64) (PokeboxEntry, error) {
	collection := db.client.Database("pokemon").Collection("pokemon")
	filter := bson.M{"id": id}

	var pokemon PokeboxEntry
	err := collection.FindOne(context.Background(), filter, options.FindOne().SetProjection(bson.M{"_id": 0})).Decode(&pokemon)
	if err == nil {
		return pokemon, nil
	}

	// Pokemon not in DB, fetch from PokeAPI
	return db.fetchAndStorePokemon(fmt.Sprintf("%d", id))
}

func (db *MongoDb) GetPokemonByIdentifier(identifier string) (PokeboxEntry, error) {
	collection := db.client.Database("pokemon").Collection("pokemon")
	var filter bson.M
	if id, err := strconv.ParseInt(identifier, 10, 64); err == nil {
		filter = bson.M{"id": id}
	} else {
		filter = bson.M{"name": identifier}
	}

	var pokemon PokeboxEntry
	err := collection.FindOne(context.Background(), filter, options.FindOne().SetProjection(bson.M{"_id": 0})).Decode(&pokemon)
	if err == nil {
		return pokemon, nil
	}

	// Pokemon not in DB, fetch from PokeAPI
	return db.fetchAndStorePokemon(identifier)
}

func (db *MongoDb) fetchAndStorePokemon(identifier string) (PokeboxEntry, error) {
	client := pokego.NewClient()

	// Get basic Pokemon data
	pokemonData, err := client.Pokemon.GetPokemon(identifier)
	if err != nil {
		return PokeboxEntry{}, fmt.Errorf("failed to fetch pokemon %s: %v", identifier, err)
	}

	// Get species data for description (by species name, as the identifier may be a form like "deoxys-normal")
	speciesData, err := client.Pokemon.GetPokemonSpecies(pokemonData.Species.Name)
	if err != nil {
		return PokeboxEntry{}, fmt.Errorf("failed to fetch pokemon species %s: %v", pokemonData.Species.Name, err)
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

	// Fetch the raw sprites JSON; fall back to PokeGo's typed sprites if that fails
	sprites, err := fetchRawSprites(pokemonData.ID)
	if err != nil {
		log.Printf("Failed to fetch raw sprites for %d: %v", pokemonData.ID, err)
		sprites = toBsonM(pokemonData.Sprites)
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

// fetchRawSprites gets the untyped "sprites" object straight from PokeAPI, like rust-server does.
func fetchRawSprites(id int) (bson.M, error) {
	resp, err := http.Get(fmt.Sprintf("https://pokeapi.co/api/v2/pokemon/%d", id))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}

	var body struct {
		Sprites bson.M `json:"sprites"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, err
	}
	if body.Sprites == nil {
		return nil, fmt.Errorf("sprites field missing from response")
	}
	return body.Sprites, nil
}

// toBsonM round-trips a value through JSON to get a generic map.
func toBsonM(v any) bson.M {
	m := bson.M{}
	if b, err := json.Marshal(v); err == nil {
		_ = json.Unmarshal(b, &m)
	}
	return m
}

// Utility functions
func generateRandomNoWithExclude(excludes []int64) int64 {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	for {
		num := r.Int63n(1025) + 1
		found := false
		for _, exclude := range excludes {
			if num == exclude {
				found = true
				break
			}
		}
		if !found {
			return num
		}
	}
}

type MockDb struct {
	pokemon map[string]PokeboxEntry
}

func (db *MockDb) GetPokedex() ([]PokedexEntry, error) {
	pokedex := []PokedexEntry{}
	for _, pokemon := range db.pokemon {
		pokedex = append(pokedex, PokedexEntry{
			Name: pokemon.Name,
			ID:   pokemon.ID,
		})
	}
	return pokedex, nil
}

func (db *MockDb) GetPokemonByID(id int64) (PokeboxEntry, error) {
	for _, pokemon := range db.pokemon {
		if pokemon.ID == id {
			return pokemon, nil
		}
	}

	// Mock fetching from PokeAPI
	pokemon := PokeboxEntry{
		ID:                 id,
		Name:               fmt.Sprintf("pokemon%d", id),
		SpeciesDescription: "Mock Pokemon description",
		Types:              []string{"normal"},
		Abilities:          []PokemonAbility{{Name: "mock-ability", FlavourText: "Mock ability", Effect: "Mock effect"}},
		Sprites: bson.M{
			"front_default": fmt.Sprintf("https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/%d.png", id),
		},
	}

	db.pokemon[pokemon.Name] = pokemon
	return pokemon, nil
}

func (db *MockDb) GetPokemonByIdentifier(identifier string) (PokeboxEntry, error) {
	if id, err := strconv.ParseInt(identifier, 10, 64); err == nil {
		return db.GetPokemonByID(id)
	}

	if pokemon, exists := db.pokemon[identifier]; exists {
		return pokemon, nil
	}

	// Mock fetching from PokeAPI
	pokemon := PokeboxEntry{
		ID:                 int64(len(db.pokemon) + 1),
		Name:               identifier,
		SpeciesDescription: "Mock Pokemon description",
		Types:              []string{"normal"},
		Abilities:          []PokemonAbility{{Name: "mock-ability", FlavourText: "Mock ability", Effect: "Mock effect"}},
		Sprites: bson.M{
			"front_default": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png",
		},
	}

	db.pokemon[identifier] = pokemon
	return pokemon, nil
}

func (db *MockDb) StorePokemon(pokemon *PokeboxEntry) error {
	if db.pokemon == nil {
		db.pokemon = make(map[string]PokeboxEntry)
	}
	db.pokemon[pokemon.Name] = *pokemon
	return nil
}

func createDb() (PokeboxDb, error) {
	uri := os.Getenv("MONGODB_URI")
	if uri == "" {
		uri = "mongodb://admin:testtest@localhost:27017/?authSource=admin"
	}

	fmt.Printf("Connecting to MongoDB at: %s\n", uri)
	// Decode nested documents (e.g. sprites.other.home) as maps so they serialise to plain JSON objects
	clientOptions := options.Client().ApplyURI(uri).SetBSONOptions(&options.BSONOptions{DefaultDocumentM: true})
	client, err := mongo.Connect(context.Background(), clientOptions)
	if err != nil {
		fmt.Printf("Failed to connect to MongoDB, falling back to mock database: %v\n", err)
		return &MockDb{
			pokemon: make(map[string]PokeboxEntry),
		}, nil
	}

	// Test the connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := client.Ping(ctx, nil); err != nil {
		fmt.Printf("Failed to ping MongoDB, falling back to mock database: %v\n", err)
		return &MockDb{
			pokemon: make(map[string]PokeboxEntry),
		}, nil
	}

	fmt.Println("Connected to MongoDB successfully")
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
			log.Printf("Failed to get pokedex: %v", err)
			pokedex = []PokedexEntry{}
		}

		usedIDs := make([]int64, 0, len(pokedex))
		for _, entry := range pokedex {
			usedIDs = append(usedIDs, entry.ID)
		}

		pokemon, err := db.GetPokemonByID(generateRandomNoWithExclude(usedIDs))
		if err != nil {
			log.Printf("Failed to get random new pokemon: %v", err)
			return c.String(http.StatusInternalServerError, "Internal Server Error")
		}

		return c.JSON(http.StatusOK, pokemon)
	})
	e.GET("/pokemon/:identifier", func(c *echo.Context) error {
		identifier := c.Param("identifier")

		pokemon, err := db.GetPokemonByIdentifier(identifier)
		if err != nil {
			log.Printf("Failed to get pokemon %s: %v", identifier, err)
			return c.String(http.StatusNotFound, "Not Found")
		}

		return c.JSON(http.StatusOK, pokemon)
	})
	e.GET("/pokedex", func(c *echo.Context) error {
		pokedex, err := db.GetPokedex()
		if err != nil {
			// rust-server returns an empty pokedex rather than an error
			log.Printf("Failed to get pokedex: %v", err)
			pokedex = []PokedexEntry{}
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
