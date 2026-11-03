package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// failingDb returns errors for every lookup, to exercise the error status codes.
type failingDb struct{ MockDb }

func (db *failingDb) GetPokemonByID(int64) (PokeboxEntry, error) {
	return PokeboxEntry{}, errors.New("not found")
}

func (db *failingDb) GetPokemonByIdentifier(string) (PokeboxEntry, error) {
	return PokeboxEntry{}, errors.New("not found")
}

func (db *failingDb) GetPokedex() ([]PokedexEntry, error) {
	return nil, errors.New("db down")
}

func newMockDb() *MockDb {
	return &MockDb{pokemon: map[string]PokeboxEntry{}}
}

func do(t *testing.T, db PokeboxDb, method, path string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	newServer(db).ServeHTTP(rec, httptest.NewRequest(method, path, nil))
	return rec
}

func TestIndexRoute(t *testing.T) {
	rec := do(t, newMockDb(), http.MethodGet, "/")
	if rec.Code != http.StatusOK || rec.Body.String() != "Hello, World!" {
		t.Fatalf("got %d %q", rec.Code, rec.Body.String())
	}
}

func TestSpecificPokemonRoute(t *testing.T) {
	rec := do(t, newMockDb(), http.MethodGet, "/pokemon/5")
	if rec.Code != http.StatusOK {
		t.Fatalf("got %d", rec.Code)
	}
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{"name", "id", "species_description", "types", "abilities", "sprites"} {
		if _, ok := body[key]; !ok {
			t.Errorf("missing key %q in %s", key, rec.Body.String())
		}
	}
	if body["id"] != float64(5) {
		t.Errorf("expected id 5, got %v", body["id"])
	}
	if _, ok := body["sprites"].(map[string]any); !ok {
		t.Errorf("expected sprites to be an object, got %T", body["sprites"])
	}
}

func TestSpecificPokemonRouteNotFound(t *testing.T) {
	for _, path := range []string{"/pokemon/0", "/pokemon/missingno"} {
		if rec := do(t, &failingDb{}, http.MethodGet, path); rec.Code != http.StatusNotFound {
			t.Errorf("%s: expected 404, got %d", path, rec.Code)
		}
	}
}

func TestRandomNewRoute(t *testing.T) {
	rec := do(t, newMockDb(), http.MethodGet, "/pokemon/random-new")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"id"`) {
		t.Fatalf("got %d %s", rec.Code, rec.Body.String())
	}
}

func TestRandomNewRouteError(t *testing.T) {
	if rec := do(t, &failingDb{}, http.MethodGet, "/pokemon/random-new"); rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", rec.Code)
	}
}

func TestPokedexRoute(t *testing.T) {
	db := newMockDb()
	_ = db.StorePokemon(&PokeboxEntry{ID: 1, Name: "bulbasaur"})

	rec := do(t, db, http.MethodGet, "/pokedex")
	if rec.Code != http.StatusOK || strings.TrimSpace(rec.Body.String()) != `[{"name":"bulbasaur","id":1}]` {
		t.Fatalf("got %d %s", rec.Code, rec.Body.String())
	}
}

func TestPokedexRouteEmptyIsArray(t *testing.T) {
	for _, db := range []PokeboxDb{newMockDb(), &failingDb{}} {
		rec := do(t, db, http.MethodGet, "/pokedex")
		if rec.Code != http.StatusOK || strings.TrimSpace(rec.Body.String()) != "[]" {
			t.Errorf("expected 200 [], got %d %s", rec.Code, rec.Body.String())
		}
	}
}

func TestOptionsAndCors(t *testing.T) {
	rec := do(t, newMockDb(), http.MethodOptions, "/anything/at/all")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", rec.Code)
	}

	for _, path := range []string{"/pokedex", "/pokemon/0"} {
		rec := do(t, &failingDb{}, http.MethodGet, path)
		for name, want := range corsHeaders {
			if got := rec.Header().Get(name); got != want {
				t.Errorf("%s: header %s = %q, want %q", path, name, got, want)
			}
		}
	}
}

func TestGenerateRandomNoWithExclude(t *testing.T) {
	excludes := []int64{1, 2, 3, 1000}
	for range 500 {
		v := generateRandomNoWithExclude(excludes)
		if v < 1 || v > 1025 {
			t.Fatalf("out of range: %d", v)
		}
		for _, e := range excludes {
			if v == e {
				t.Fatalf("got excluded value %d", v)
			}
		}
	}
}
