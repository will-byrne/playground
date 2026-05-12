package main

import (
	"context"
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

type PokemonSprites struct {
	BackDefault      string `json:"back_default" bson:"back_default"`
	BackFemale       string `json:"back_female" bson:"back_female"`
	BackShiny        string `json:"back_shiny" bson:"back_shiny"`
	BackShinyFemale  string `json:"back_shiny_female" bson:"back_shiny_female"`
	FrontDefault     string `json:"front_default" bson:"front_default"`
	FrontFemale      string `json:"front_female" bson:"front_female"`
	FrontShiny       string `json:"front_shiny" bson:"front_shiny"`
	FrontShinyFemale string `json:"front_shiny_female" bson:"front_shiny_female"`
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
	Sprites            PokemonSprites   `json:"sprites" bson:"sprites"`
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
	cursor, err := collection.Find(context.Background(), bson.M{}, options.Find().SetProjection(bson.M{"_id": 0, "id": 1, "name": 1}).SetSort(bson.M{"id": 1}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var pokedex []PokedexEntry
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

	// Get species data for description
	speciesData, err := client.Pokemon.GetPokemonSpecies(identifier)
	if err != nil {
		return PokeboxEntry{}, fmt.Errorf("failed to fetch pokemon species %s: %v", identifier, err)
	}

	// Get abilities
	var abilities []PokemonAbility
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
	var types []string
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

	// Convert sprites
	sprites := PokemonSprites{
		BackDefault:      pokemonData.Sprites.BackDefault,
		BackFemale:       pokemonData.Sprites.BackFemale,
		BackShiny:        pokemonData.Sprites.BackShiny,
		BackShinyFemale:  pokemonData.Sprites.BackShinyFemale,
		FrontDefault:     pokemonData.Sprites.FrontDefault,
		FrontFemale:      pokemonData.Sprites.FrontFemale,
		FrontShiny:       pokemonData.Sprites.FrontShiny,
		FrontShinyFemale: pokemonData.Sprites.FrontShinyFemale,
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
	var pokedex []PokedexEntry
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
		Sprites: PokemonSprites{
			FrontDefault: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/" + fmt.Sprintf("%d", id) + ".png",
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
		Sprites: PokemonSprites{
			FrontDefault: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png",
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

// HTTP handlers
func allOptions(c echo.Context) error {
	return c.NoContent(http.StatusNoContent)
}

func createDb() (PokeboxDb, error) {
	uri := os.Getenv("MONGODB_URI")
	if uri == "" {
		uri = "mongodb://admin:testtest@localhost:27017/?authSource=admin"
	}

	fmt.Printf("Connecting to MongoDB at: %s\n", uri)
	clientOptions := options.Client().ApplyURI(uri)
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

func main() {
	db, err := createDb()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	e := echo.New()
	e.Use(middleware.RequestLogger())

	// CORS middleware
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowHeaders: []string{"*"},
	}))

	// Routes
	e.GET("/", func(c *echo.Context) error {
		return c.String(http.StatusOK, "Hello, World!")
	})
	e.GET("/pokemon/random-new", func(c *echo.Context) error {
		pokedex, err := db.GetPokedex()
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get pokedex"})
		}

		var usedIDs []int64
		for _, entry := range pokedex {
			usedIDs = append(usedIDs, entry.ID)
		}

		randomID := generateRandomNoWithExclude(usedIDs)
		pokemon, err := db.GetPokemonByID(randomID)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get pokemon"})
		}

		return c.JSON(http.StatusOK, pokemon)
	})
	e.GET("/pokemon/:identifier", func(c *echo.Context) error {
		identifier := c.Param("identifier")

		pokemon, err := db.GetPokemonByIdentifier(identifier)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get pokemon"})
		}

		return c.JSON(http.StatusOK, pokemon)
	})
	e.GET("/pokedex", func(c *echo.Context) error {
		pokedex, err := db.GetPokedex()
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get pokedex"})
		}

		return c.JSON(http.StatusOK, pokedex)
	})
	e.OPTIONS("/*", func(c *echo.Context) error {
		return c.NoContent(http.StatusNoContent)
	})

	fmt.Println("Starting server on :3000")
	if err := e.Start(":3000"); err != nil {
		e.Logger.Error("failed to start server", "error", err)
	}
}
