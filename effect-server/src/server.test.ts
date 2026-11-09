import { describe, expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { PokeboxApi } from "./api";
import { SystemHandlers } from "./handlers";

// A typed in-memory client for the API: requests go through the real
// encoding, routing and decoding, but no server or socket is started.
// Add each group's handlers (with test Layers for their services) to
// `handlers` as you build them.
const handlers = Layer.mergeAll(SystemHandlers, HttpServer.layerServices);
const makeClient = HttpApiTest.groups(PokeboxApi, ["system"]);
const run = <A, E>(f: (client: Effect.Success<typeof makeClient>) => Effect.Effect<A, E>) =>
  Effect.runPromise(makeClient.pipe(Effect.flatMap(f), Effect.scoped, Effect.provide(handlers)));

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
  test("says Hello, World!", async () => {
    expect(await run((client) => client.index())).toBe("Hello, World!");
  });
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

describe("mapping (port hono-server/src/mapping.test.ts)", () => {
  test.todo("uses the first English text, with the 'No description available' / 'No effect available' fallbacks");
  test.todo("form_name is the form's English name, or '' when it has none");
  test.todo("a form's species_description is its own pokemon-form flavour text, else the species'");
  test.todo("varieties never include the entry itself, and keep the species' order");
  test.todo("is_default comes from the species' varieties list");
  test.todo("keeps the raw sprites untouched");
});

describe("varieties", () => {
  test.todo("a species with one form has varieties [] and form_name ''");
  test.todo("vulpix lists vulpix-alola (10103, 'Alolan Form', ice, snow-cloak) in full");
  test.todo("vulpix-alola lists vulpix as the default form, and never itself");
  test.todo("a variety PokeAPI 404s is skipped; any other variety failure fails the lookup (502)");
  test.todo("a missing pokemon-form just means no form text, not a failure");
  test.todo("stored entries without varieties (pre-1.1.0) are refetched and replaced");
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
