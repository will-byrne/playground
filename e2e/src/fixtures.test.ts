// Checks the data WireMock serves still matches the contract, so the e2e
// tests can't drift from what real servers send. Run with `bun run check`.
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { assertMatchesSpec } from "../../contract/src/schema.ts";

const files = new URL("../wiremock/__files/", import.meta.url);
const read = (name: string) => JSON.parse(readFileSync(new URL(name, files), "utf8"));

describe("WireMock fixtures match contract/openapi.yaml", () => {
  test("pokedex.json", () => {
    assertMatchesSpec("/pokedex", read("pokedex.json"));
  });

  for (const name of readdirSync(files).filter((f) => f.startsWith("pokemon-"))) {
    test(name, () => {
      const pokemon = read(name);
      assertMatchesSpec("/pokemon/{idOrName}", pokemon);
      expect(name).toBe(`pokemon-${pokemon.id}.json`);
    });
  }
});
