import { describe, test } from "bun:test";

// The behaviours the contract asks for, as a checklist. Turn each `test.todo`
// into a real test as you build the matching piece: run the handlers against
// test Layers for PokeApi and PokeboxStore (`HttpApiTest.groups` from
// effect/http-api gives an in-memory client), the way the other servers test against fakes.
// `bun test --todo` runs the todos so you can see which are still missing.

describe("identifier", () => {
  test.todo("accepts ids and names, lowercased and trimmed (' Mr-Mime ' -> 'mr-mime')");
  test.todo("rejects anything that isn't 1-64 of a-z, 0-9 and '-' ('..', 'a b', '1.5', '+5', '\\u0084')");
});

describe("pickUncaughtId", () => {
  test.todo("never returns a caught id, and stays within 1..1025");
  test.todo("finds the last one left");
  test.todo("is none once all 1025 are caught");
  test.todo("ignores caught ids above 1025 (alternate forms)");
});

describe("GET /", () => {
  test.todo("says Hello, World! as plain text");
});

describe("GET /pokemon/:idOrName", () => {
  test.todo("by id returns the full entry");
  test.todo("by name looks up by name, case-insensitively");
  test.todo("stores what it fetches (upsert by id)");
  test.todo("names that can't exist are 404 without touching PokeApi or the store");
  test.todo("NotFound from PokeApi is 404");
  test.todo("Upstream (any other PokeApi failure) is 502, not 404");
  test.todo("Db failures are 500, not 404");
});

describe("GET /pokedex", () => {
  test.todo("lists stored { id, name } sorted by id");
  test.todo("a Db failure is 500, not an empty list");
});

describe("GET /pokemon/random-new", () => {
  test.todo("returns, and stores, a Pokémon that wasn't caught");
  test.todo("is 404 once every Pokémon is caught");
});

describe("CORS", () => {
  test.todo("every response (errors included) has Access-Control-Allow-Origin: *");
  test.todo("OPTIONS on any path is 204");
});
