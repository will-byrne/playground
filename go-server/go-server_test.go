package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sort"
	"strconv"
	"strings"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

// fakeDb is an in-memory Pokébox. Stored Pokémon are served as-is; any other
// id in the dex range (or a known name) is "fetched" and then stored, like
// MongoDb. failure makes every call fail, to test the error statuses.
type fakeDb struct {
	stored  map[int64]PokeboxEntry
	failure error
}

var knownNames = map[string]int64{"bulbasaur": 1, "ivysaur": 2, "pikachu": 25}

func entry(id int64) PokeboxEntry {
	name := fmt.Sprintf("pokemon-%d", id)
	for known, knownID := range knownNames {
		if knownID == id {
			name = known
		}
	}
	return PokeboxEntry{
		ID:                 id,
		Name:               name,
		SpeciesDescription: "A test Pokémon.",
		Types:              []string{"grass", "poison"},
		Abilities:          []PokemonAbility{},
		Sprites:            bson.M{"front_default": fmt.Sprintf("https://example.com/%d.png", id)},
	}
}

func newFakeDb(ids ...int64) *fakeDb {
	db := &fakeDb{stored: map[int64]PokeboxEntry{}}
	for _, id := range ids {
		db.stored[id] = entry(id)
	}
	return db
}

func failingDb(err error) *fakeDb {
	db := newFakeDb()
	db.failure = err
	return db
}

func (db *fakeDb) GetPokedex() ([]PokedexEntry, error) {
	if db.failure != nil {
		return nil, db.failure
	}
	pokedex := []PokedexEntry{}
	for _, p := range db.stored {
		pokedex = append(pokedex, PokedexEntry{Name: p.Name, ID: p.ID})
	}
	sort.Slice(pokedex, func(i, j int) bool { return pokedex[i].ID < pokedex[j].ID })
	return pokedex, nil
}

func (db *fakeDb) GetPokemonByID(id int64) (PokeboxEntry, error) {
	if db.failure != nil {
		return PokeboxEntry{}, db.failure
	}
	if p, ok := db.stored[id]; ok {
		return p, nil
	}
	if id < 1 || id > maxPokemonID {
		return PokeboxEntry{}, ErrNotFound
	}
	db.stored[id] = entry(id)
	return db.stored[id], nil
}

func (db *fakeDb) GetPokemonByIdentifier(identifier string) (PokeboxEntry, error) {
	if id, err := strconv.ParseInt(identifier, 10, 64); err == nil {
		return db.GetPokemonByID(id)
	}
	if db.failure != nil {
		return PokeboxEntry{}, db.failure
	}
	id, ok := knownNames[identifier]
	if !ok {
		return PokeboxEntry{}, ErrNotFound
	}
	return db.GetPokemonByID(id)
}

func (db *fakeDb) StorePokemon(pokemon *PokeboxEntry) error {
	if db.failure != nil {
		return db.failure
	}
	db.stored[pokemon.ID] = *pokemon
	return nil
}

var (
	errDbDown  = fmt.Errorf("%w: connection refused", ErrDb)
	errPokeAPI = fmt.Errorf("%w: timed out", ErrUpstream)
	allDexIDs  = func() []int64 {
		ids := make([]int64, 0, maxPokemonID)
		for id := int64(1); id <= maxPokemonID; id++ {
			ids = append(ids, id)
		}
		return ids
	}
)

func do(t *testing.T, db PokeboxDb, method, path string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	newServer(db).ServeHTTP(rec, httptest.NewRequest(method, path, nil))
	return rec
}

func decode(t *testing.T, rec *httptest.ResponseRecorder) any {
	t.Helper()
	var body any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("body is not JSON: %v: %s", err, rec.Body.String())
	}
	return body
}

func expectStatus(t *testing.T, db PokeboxDb, path string, want int) {
	t.Helper()
	if rec := do(t, db, http.MethodGet, path); rec.Code != want {
		t.Errorf("%s: expected %d, got %d (%s)", path, want, rec.Code, rec.Body.String())
	}
}

// --- index ----------------------------------------------------------------

func TestIndexRoute(t *testing.T) {
	rec := do(t, newFakeDb(), http.MethodGet, "/")
	if rec.Code != http.StatusOK || rec.Body.String() != "Hello, World!" {
		t.Fatalf("got %d %q", rec.Code, rec.Body.String())
	}
}

// --- /pokedex -------------------------------------------------------------

func TestPokedexListsStoredPokemon(t *testing.T) {
	rec := do(t, newFakeDb(1, 2), http.MethodGet, "/pokedex")
	want := `[{"name":"bulbasaur","id":1},{"name":"ivysaur","id":2}]`
	if rec.Code != http.StatusOK || strings.TrimSpace(rec.Body.String()) != want {
		t.Fatalf("got %d %s", rec.Code, rec.Body.String())
	}
}

func TestPokedexEmptyIsArray(t *testing.T) {
	rec := do(t, newFakeDb(), http.MethodGet, "/pokedex")
	if rec.Code != http.StatusOK || strings.TrimSpace(rec.Body.String()) != "[]" {
		t.Fatalf("expected 200 [], got %d %s", rec.Code, rec.Body.String())
	}
}

func TestPokedexDbFailureIs500NotAnEmptyList(t *testing.T) {
	expectStatus(t, failingDb(errDbDown), "/pokedex", http.StatusInternalServerError)
}

// --- /pokemon/:identifier -------------------------------------------------

func TestPokemonByIDReturnsTheFullEntry(t *testing.T) {
	rec := do(t, newFakeDb(), http.MethodGet, "/pokemon/25")
	if rec.Code != http.StatusOK {
		t.Fatalf("got %d", rec.Code)
	}
	body := decode(t, rec).(map[string]any)
	if body["id"] != float64(25) || body["name"] != "pikachu" {
		t.Errorf("unexpected body %s", rec.Body.String())
	}
	for _, key := range []string{"name", "id", "species_description", "types", "abilities", "sprites"} {
		if _, ok := body[key]; !ok {
			t.Errorf("missing key %q in %s", key, rec.Body.String())
		}
	}
	if _, ok := body["sprites"].(map[string]any); !ok {
		t.Errorf("expected sprites to be an object, got %T", body["sprites"])
	}
}

func TestPokemonByNameLooksUpByName(t *testing.T) {
	rec := do(t, newFakeDb(), http.MethodGet, "/pokemon/pikachu")
	body := decode(t, rec).(map[string]any)
	if rec.Code != http.StatusOK || body["id"] != float64(25) {
		t.Fatalf("got %d %s", rec.Code, rec.Body.String())
	}
}

func TestUnknownPokemonAre404(t *testing.T) {
	for _, path := range []string{"/pokemon/0", "/pokemon/-1", "/pokemon/99999", "/pokemon/missingno"} {
		expectStatus(t, newFakeDb(), path, http.StatusNotFound)
	}
}

func TestPokeAPIFailuresAre502NotNotFound(t *testing.T) {
	for _, path := range []string{"/pokemon/1", "/pokemon/bulbasaur"} {
		expectStatus(t, failingDb(errPokeAPI), path, http.StatusBadGateway)
	}
}

func TestDbFailuresAre500NotNotFound(t *testing.T) {
	expectStatus(t, failingDb(errDbDown), "/pokemon/1", http.StatusInternalServerError)
}

func TestUnclassifiedErrorsAre500(t *testing.T) {
	expectStatus(t, failingDb(errors.New("something odd")), "/pokemon/1", http.StatusInternalServerError)
}

// --- /pokemon/random-new --------------------------------------------------

func TestRandomNewReturnsAPokemonNotYetStored(t *testing.T) {
	ids := []int64{}
	for _, id := range allDexIDs() {
		if id != 700 {
			ids = append(ids, id)
		}
	}
	rec := do(t, newFakeDb(ids...), http.MethodGet, "/pokemon/random-new")
	body := decode(t, rec).(map[string]any)
	if rec.Code != http.StatusOK || body["id"] != float64(700) {
		t.Fatalf("got %d %s", rec.Code, rec.Body.String())
	}
}

func TestRandomNewIs404OnceAllAreStored(t *testing.T) {
	db := newFakeDb(allDexIDs()...)
	done := make(chan int, 1)
	// This used to loop forever, so fail rather than hang if it regresses.
	go func() { done <- do(t, db, http.MethodGet, "/pokemon/random-new").Code }()
	select {
	case code := <-done:
		if code != http.StatusNotFound {
			t.Fatalf("expected 404, got %d", code)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("random-new hung when every pokemon was stored")
	}
}

func TestRandomNewDbFailureIs500(t *testing.T) {
	// Previously treated as an empty pokedex.
	expectStatus(t, failingDb(errDbDown), "/pokemon/random-new", http.StatusInternalServerError)
}

func TestRandomNewPokeAPIFailureIs502(t *testing.T) {
	expectStatus(t, &pokedexOkFetchFails{fakeDb: newFakeDb()}, "/pokemon/random-new", http.StatusBadGateway)
}

// pokedexOkFetchFails has a working pokedex but PokeAPI is down.
type pokedexOkFetchFails struct{ *fakeDb }

func (db *pokedexOkFetchFails) GetPokemonByID(int64) (PokeboxEntry, error) {
	return PokeboxEntry{}, errPokeAPI
}

// --- pickUncaughtID -------------------------------------------------------

func TestPickUncaughtIDNeverReturnsACaughtID(t *testing.T) {
	caught := []int64{1, 2, 3, 1000}
	for range 500 {
		id, ok := pickUncaughtID(caught)
		if !ok || id < 1 || id > maxPokemonID {
			t.Fatalf("got %d %v", id, ok)
		}
		for _, c := range caught {
			if id == c {
				t.Fatalf("got caught id %d", id)
			}
		}
	}
}

func TestPickUncaughtIDIsFalseWhenAllAreCaught(t *testing.T) {
	if id, ok := pickUncaughtID(allDexIDs()); ok {
		t.Fatalf("expected none left, got %d", id)
	}
}

func TestPickUncaughtIDIgnoresIDsOutsideTheRange(t *testing.T) {
	// Alternate forms have ids above 10000; they don't use up a dex slot.
	caught := append(allDexIDs()[1:], 10001)
	if id, ok := pickUncaughtID(caught); !ok || id != 1 {
		t.Fatalf("expected 1, got %d %v", id, ok)
	}
}

// --- fetchPokemonFrom (PokeAPI status handling) ---------------------------

func pokeAPI(t *testing.T, status int, body string) string {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(status)
		_, _ = w.Write([]byte(body))
	}))
	t.Cleanup(server.Close)
	return server.URL
}

func TestFetchPokemonDecodesAndKeepsRawSprites(t *testing.T) {
	url := pokeAPI(t, http.StatusOK, `{"id": 1, "name": "bulbasaur", "species": {"name": "bulbasaur"},
		"sprites": {"front_default": "f.png", "other": {"home": {"front_shiny": "s.png"}}}}`)
	pokemon, sprites, err := fetchPokemonFrom(url, "1")
	if err != nil {
		t.Fatal(err)
	}
	if pokemon.ID != 1 || pokemon.Name != "bulbasaur" || pokemon.Species.Name != "bulbasaur" {
		t.Errorf("unexpected pokemon %+v", pokemon)
	}
	if sprites["other"].(map[string]any)["home"].(map[string]any)["front_shiny"] != "s.png" {
		t.Errorf("raw sprites not kept: %v", sprites)
	}
}

func TestFetchPokemon404IsNotFound(t *testing.T) {
	_, _, err := fetchPokemonFrom(pokeAPI(t, http.StatusNotFound, "Not Found"), "missingno")
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestFetchPokemonServerErrorIsUpstream(t *testing.T) {
	_, _, err := fetchPokemonFrom(pokeAPI(t, http.StatusServiceUnavailable, "down"), "1")
	if !errors.Is(err, ErrUpstream) {
		t.Fatalf("expected ErrUpstream, got %v", err)
	}
}

func TestFetchPokemonBadJSONIsUpstream(t *testing.T) {
	_, _, err := fetchPokemonFrom(pokeAPI(t, http.StatusOK, "<html>oops</html>"), "1")
	if !errors.Is(err, ErrUpstream) {
		t.Fatalf("expected ErrUpstream, got %v", err)
	}
}

func TestFetchPokemonUnreachableIsUpstream(t *testing.T) {
	server := httptest.NewServer(http.NotFoundHandler())
	url := server.URL
	server.Close()
	_, _, err := fetchPokemonFrom(url, "1")
	if !errors.Is(err, ErrUpstream) {
		t.Fatalf("expected ErrUpstream, got %v", err)
	}
}

// --- CORS -----------------------------------------------------------------

func TestOptionsAndCors(t *testing.T) {
	rec := do(t, newFakeDb(), http.MethodOptions, "/anything/at/all")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", rec.Code)
	}

	for _, path := range []string{"/pokedex", "/pokemon/0", "/pokemon/1"} {
		for _, db := range []PokeboxDb{newFakeDb(), failingDb(errDbDown)} {
			rec := do(t, db, http.MethodGet, path)
			for name, want := range corsHeaders {
				if got := rec.Header().Get(name); got != want {
					t.Errorf("%s (%d): header %s = %q, want %q", path, rec.Code, name, got, want)
				}
			}
		}
	}
}
