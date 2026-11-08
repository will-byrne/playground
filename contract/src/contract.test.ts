import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { assertMatchesSpec } from "./schema";

// Checks one running server against openapi.yaml. Point it at a server with
// BASE_URL (default: rust-server on :3000). First lookups go through to
// PokeAPI, hence the generous timeout.
const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
setDefaultTimeout(30_000);

const get = (path: string, init?: RequestInit) => fetch(`${BASE_URL}${path}`, init);

async function json(path: string, specPath = path) {
  const res = await get(path);
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toContain("application/json");
  const body = await res.json();
  assertMatchesSpec(specPath, body);
  return body;
}

describe(`contract @ ${BASE_URL}`, () => {
  test("GET / says hello", async () => {
    const res = await get("/");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Hello, World!");
  });

  describe("GET /pokemon/{idOrName}", () => {
    test("by id", async () => {
      const pikachu = await json("/pokemon/25", "/pokemon/{idOrName}");
      expect(pikachu.id).toBe(25);
      expect(pikachu.name).toBe("pikachu");
      expect(pikachu.types).toEqual(["electric"]);
    });

    test("by name", async () => {
      const bulbasaur = await json("/pokemon/bulbasaur", "/pokemon/{idOrName}");
      expect(bulbasaur.id).toBe(1);
      expect(bulbasaur.name).toBe("bulbasaur");
      expect(bulbasaur.types).toEqual(["grass", "poison"]);
    });

    test("id and name give the same Pokémon", async () => {
      const [byId, byName] = await Promise.all([
        json("/pokemon/7", "/pokemon/{idOrName}"),
        json("/pokemon/squirtle", "/pokemon/{idOrName}"),
      ]);
      expect(byName).toEqual(byId);
    });

    test("abilities carry English text", async () => {
      const pikachu = await json("/pokemon/25", "/pokemon/{idOrName}");
      const names = pikachu.abilities.map((a: { name: string }) => a.name);
      expect(names).toContain("static");
    });

    test("unknown id is 404", async () => {
      expect((await get("/pokemon/99999")).status).toBe(404);
    });

    test("unknown name is 404", async () => {
      expect((await get("/pokemon/definitely-not-a-pokemon")).status).toBe(404);
    });
  });

  describe("GET /pokedex", () => {
    test("is sorted by id without duplicates and includes looked-up Pokémon", async () => {
      await json("/pokemon/25", "/pokemon/{idOrName}");
      const dex: { id: number }[] = await json("/pokedex");
      const ids = dex.map((e) => e.id);
      expect(ids).toEqual([...new Set(ids)].sort((a, b) => a - b));
      expect(ids).toContain(25);
    });
  });

  describe("GET /pokemon/random-new", () => {
    test("returns a Pokémon that wasn't caught and then is", async () => {
      const before: { id: number }[] = await json("/pokedex");
      const caught = new Set(before.map((e) => e.id));

      const res = await get("/pokemon/random-new");
      if (res.status === 404) {
        // Only allowed once every Pokémon is stored.
        expect(caught.size).toBeGreaterThanOrEqual(1025);
        return;
      }
      expect(res.status).toBe(200);
      const fresh = await res.json();
      assertMatchesSpec("/pokemon/random-new", fresh);
      expect(fresh.id).toBeGreaterThanOrEqual(1);
      expect(fresh.id).toBeLessThanOrEqual(1025);
      expect(caught.has(fresh.id)).toBe(false);

      const after: { id: number }[] = await json("/pokedex");
      expect(after.map((e) => e.id)).toContain(fresh.id);
    });
  });

  describe("CORS", () => {
    test("responses allow any origin", async () => {
      const res = await get("/pokedex", { headers: { Origin: "http://localhost:4004" } });
      expect(res.headers.get("access-control-allow-origin")).toBe("*");
    });

    test("preflight answers 204", async () => {
      const res = await get("/pokemon/25", {
        method: "OPTIONS",
        headers: { Origin: "http://localhost:4004", "Access-Control-Request-Method": "GET" },
      });
      expect(res.status).toBe(204);
      expect(res.headers.get("access-control-allow-origin")).toBe("*");
    });
  });
});
