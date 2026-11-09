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
		Varieties:          []PokemonVariety{},
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
	for _, key := range []string{"name", "id", "form_name", "species_description", "types", "abilities", "sprites", "varieties"} {
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

func TestNamesThatCantExistAre404WithoutALookup(t *testing.T) {
	// Every lookup against this store fails with 502, so a 404 proves the
	// route answered without asking the store (and so PokeAPI).
	for _, path := range []string{"/pokemon/%C2%84", "/pokemon/%13", "/pokemon/a%20b", "/pokemon/1.5", "/pokemon/%2E%2E"} {
		expectStatus(t, failingDb(errPokeAPI), path, http.StatusNotFound)
	}
}

func TestNamesAreCaseInsensitive(t *testing.T) {
	rec := do(t, newFakeDb(), http.MethodGet, "/pokemon/Pikachu")
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", rec.Code, rec.Body.String())
	}
	if id := decode(t, rec).(map[string]any)["id"]; id != float64(25) {
		t.Errorf("expected pikachu (25), got id %v", id)
	}
}

func TestNormalizeIdentifier(t *testing.T) {
	for raw, want := range map[string]string{"25": "25", "pikachu": "pikachu", "Mr-Mime": "mr-mime", "-1": "-1"} {
		if got, ok := normalizeIdentifier(raw); !ok || got != want {
			t.Errorf("normalizeIdentifier(%q) = %q, %v; want %q", raw, got, ok, want)
		}
	}
	for _, raw := range []string{"", " ", "..", "a b", "1.5", "+5", "\u0084", "\u0013", "pokémon", "%zz", strings.Repeat("a", maxIdentifierLen+1)} {
		if got, ok := normalizeIdentifier(raw); ok {
			t.Errorf("normalizeIdentifier(%q) = %q; want it rejected", raw, got)
		}
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

// --- PokeAPI fetching -------------------------------------------------------

// fakePokeAPI serves routes (path -> JSON body) like PokeAPI; any other path
// is 404. status, when set for a path, overrides the 200.
func fakePokeAPI(t *testing.T, routes map[string]string, status map[string]int) pokeAPI {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if code, ok := status[path]; ok {
			w.WriteHeader(code)
			return
		}
		body, ok := routes[path]
		if !ok {
			http.NotFound(w, r)
			return
		}
		_, _ = w.Write([]byte(body))
	}))
	t.Cleanup(server.Close)
	return pokeAPI{baseURL: server.URL}
}

// vulpixAPI is a trimmed PokeAPI for Vulpix and Alolan Vulpix, with real values.
func vulpixAPI() map[string]string {
	ability := func(name, flavor, effect string) string {
		return fmt.Sprintf(`{"name": %q,
			"flavor_text_entries": [{"flavor_text": "jp", "language": {"name": "ja"}}, {"flavor_text": %q, "language": {"name": "en"}}],
			"effect_entries": [{"short_effect": %q, "language": {"name": "en"}}]}`, name, flavor, effect)
	}
	return map[string]string{
		"pokemon/vulpix": `{"id": 37, "name": "vulpix", "is_default": true, "species": {"name": "vulpix"},
			"forms": [{"name": "vulpix"}], "abilities": [{"ability": {"name": "flash-fire"}}],
			"types": [{"type": {"name": "fire"}}], "sprites": {"front_default": "37.png", "other": {"home": {"front_shiny": "s.png"}}}}`,
		"pokemon/vulpix-alola": `{"id": 10103, "name": "vulpix-alola", "is_default": false, "species": {"name": "vulpix"},
			"forms": [{"name": "vulpix-alola"}], "abilities": [{"ability": {"name": "snow-cloak"}}, {"ability": {"name": "snow-warning"}}],
			"types": [{"type": {"name": "ice"}}], "sprites": {"front_default": "10103.png"}}`,
		"pokemon-species/vulpix": `{
			"flavor_text_entries": [{"flavor_text": "At the time of birth, it has just one tail.", "language": {"name": "en"}}],
			"varieties": [{"is_default": true, "pokemon": {"name": "vulpix"}}, {"is_default": false, "pokemon": {"name": "vulpix-alola"}}]}`,
		"pokemon-form/vulpix": `{"form_names": [], "flavor_text_entries": []}`,
		"pokemon-form/vulpix-alola": `{"form_names": [{"name": "アローラのすがた", "language": {"name": "ja"}}, {"name": "Alolan Form", "language": {"name": "en"}}],
			"flavor_text_entries": [{"flavor_text": "It exhales air colder than -58 degrees Fahrenheit.", "language": {"name": "en"}}]}`,
		"ability/flash-fire":   ability("flash-fire", "Powers up fire moves.", "Absorbs fire moves."),
		"ability/snow-cloak":   ability("snow-cloak", "Ups evasion in a hailstorm.", "Increases evasion during hail."),
		"ability/snow-warning": ability("snow-warning", "Summons hail.", "Summons hail on entry."),
	}
}

func abilityNames(abilities []PokemonAbility) []string {
	names := []string{}
	for _, a := range abilities {
		names = append(names, a.Name)
	}
	return names
}

func TestFetchEntryCarriesAlternateFormsInFull(t *testing.T) {
	entry, err := fakePokeAPI(t, vulpixAPI(), nil).fetchEntry("vulpix")
	if err != nil {
		t.Fatal(err)
	}
	if entry.ID != 37 || entry.FormName != "" || fmt.Sprint(entry.Types) != "[fire]" {
		t.Errorf("unexpected entry %+v", entry)
	}
	if entry.SpeciesDescription != "At the time of birth, it has just one tail." {
		t.Errorf("default form should keep the species text, got %q", entry.SpeciesDescription)
	}
	if len(entry.Varieties) != 1 {
		t.Fatalf("expected one variety, got %+v", entry.Varieties)
	}
	alola := entry.Varieties[0]
	if alola.ID != 10103 || alola.Name != "vulpix-alola" || alola.IsDefault || alola.FormName != "Alolan Form" {
		t.Errorf("unexpected variety %+v", alola)
	}
	if alola.SpeciesDescription != "It exhales air colder than -58 degrees Fahrenheit." {
		t.Errorf("variety should use its form's text, got %q", alola.SpeciesDescription)
	}
	if fmt.Sprint(alola.Types) != "[ice]" || fmt.Sprint(abilityNames(alola.Abilities)) != "[snow-cloak snow-warning]" {
		t.Errorf("unexpected variety types/abilities %+v", alola)
	}
	if alola.Abilities[0].FlavourText != "Ups evasion in a hailstorm." || alola.Abilities[0].Effect != "Increases evasion during hail." {
		t.Errorf("abilities should carry English text, got %+v", alola.Abilities[0])
	}
}

func TestFetchEntryKeepsRawSprites(t *testing.T) {
	entry, err := fakePokeAPI(t, vulpixAPI(), nil).fetchEntry("vulpix")
	if err != nil {
		t.Fatal(err)
	}
	if entry.Sprites["other"].(map[string]any)["home"].(map[string]any)["front_shiny"] != "s.png" {
		t.Errorf("raw sprites not kept: %v", entry.Sprites)
	}
}

func TestFetchEntryFromAnAlternateFormListsTheDefault(t *testing.T) {
	entry, err := fakePokeAPI(t, vulpixAPI(), nil).fetchEntry("vulpix-alola")
	if err != nil {
		t.Fatal(err)
	}
	if entry.ID != 10103 || entry.FormName != "Alolan Form" || len(entry.Varieties) != 1 {
		t.Fatalf("unexpected entry %+v", entry)
	}
	if v := entry.Varieties[0]; v.Name != "vulpix" || !v.IsDefault || v.FormName != "" {
		t.Errorf("unexpected variety %+v", v)
	}
}

func TestFetchEntryDescribesAFormTheSameDirectlyOrAsAVariety(t *testing.T) {
	api := fakePokeAPI(t, vulpixAPI(), nil)
	nested, err := api.fetchEntry("vulpix")
	if err != nil {
		t.Fatal(err)
	}
	direct, err := api.fetchEntry("vulpix-alola")
	if err != nil {
		t.Fatal(err)
	}
	v := nested.Varieties[0]
	got, _ := json.Marshal([]any{v.SpeciesDescription, v.FormName, v.Types, v.Abilities, v.Sprites})
	want, _ := json.Marshal([]any{direct.SpeciesDescription, direct.FormName, direct.Types, direct.Abilities, direct.Sprites})
	if string(got) != string(want) {
		t.Errorf("variety %s differs from direct %s", got, want)
	}
}

func TestFetchEntryWithoutFormTextFallsBackToTheSpecies(t *testing.T) {
	routes := vulpixAPI()
	delete(routes, "pokemon-form/vulpix-alola")
	entry, err := fakePokeAPI(t, routes, nil).fetchEntry("vulpix-alola")
	if err != nil {
		t.Fatal(err)
	}
	if entry.SpeciesDescription != "At the time of birth, it has just one tail." || entry.FormName != "" {
		t.Errorf("unexpected entry %+v", entry)
	}
}

func TestFetchEntrySkipsAVarietyPokeAPIDoesntHave(t *testing.T) {
	routes := vulpixAPI()
	delete(routes, "pokemon/vulpix-alola")
	entry, err := fakePokeAPI(t, routes, nil).fetchEntry("vulpix")
	if err != nil {
		t.Fatal(err)
	}
	if len(entry.Varieties) != 0 {
		t.Errorf("expected no varieties, got %+v", entry.Varieties)
	}
}

func TestFetchEntryFailsWhenAVarietyFails(t *testing.T) {
	api := fakePokeAPI(t, vulpixAPI(), map[string]int{"pokemon/vulpix-alola": http.StatusServiceUnavailable})
	if _, err := api.fetchEntry("vulpix"); !errors.Is(err, ErrUpstream) {
		t.Fatalf("expected ErrUpstream, got %v", err)
	}
}

func TestFetchEntrySkipsAbilitiesThatFail(t *testing.T) {
	routes := vulpixAPI()
	delete(routes, "ability/snow-cloak")
	entry, err := fakePokeAPI(t, routes, nil).fetchEntry("vulpix-alola")
	if err != nil {
		t.Fatal(err)
	}
	if got := fmt.Sprint(abilityNames(entry.Abilities)); got != "[snow-warning]" {
		t.Errorf("got abilities %s", got)
	}
}

func TestFetchEntryMissingSpeciesIsUpstream(t *testing.T) {
	routes := vulpixAPI()
	delete(routes, "pokemon-species/vulpix")
	if _, err := fakePokeAPI(t, routes, nil).fetchEntry("vulpix"); !errors.Is(err, ErrUpstream) || errors.Is(err, ErrNotFound) {
		t.Fatalf("expected only ErrUpstream, got %v", err)
	}
}

func TestFetchEntry404IsNotFound(t *testing.T) {
	_, err := fakePokeAPI(t, vulpixAPI(), nil).fetchEntry("missingno")
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestFetchEntryServerErrorIsUpstream(t *testing.T) {
	api := fakePokeAPI(t, vulpixAPI(), map[string]int{"pokemon/vulpix": http.StatusServiceUnavailable})
	if _, err := api.fetchEntry("vulpix"); !errors.Is(err, ErrUpstream) {
		t.Fatalf("expected ErrUpstream, got %v", err)
	}
}

func TestFetchEntryBadJSONIsUpstream(t *testing.T) {
	routes := vulpixAPI()
	routes["pokemon/vulpix"] = "<html>oops</html>"
	if _, err := fakePokeAPI(t, routes, nil).fetchEntry("vulpix"); !errors.Is(err, ErrUpstream) {
		t.Fatalf("expected ErrUpstream, got %v", err)
	}
}

func TestFetchEntryUnreachableIsUpstream(t *testing.T) {
	server := httptest.NewServer(http.NotFoundHandler())
	api := pokeAPI{baseURL: server.URL}
	server.Close()
	if _, err := api.fetchEntry("vulpix"); !errors.Is(err, ErrUpstream) {
		t.Fatalf("expected ErrUpstream, got %v", err)
	}
}

func TestStoredFilterOnlyMatchesEntriesWithVarieties(t *testing.T) {
	got := storedFilter(bson.M{"name": "vulpix"})
	want := bson.M{"name": "vulpix", "varieties": bson.M{"$exists": true}}
	if fmt.Sprint(got) != fmt.Sprint(want) {
		t.Errorf("got %v, want %v", got, want)
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
