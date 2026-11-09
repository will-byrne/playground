import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { get as httpGet } from "node:http";
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

    test("names are case-insensitive", async () => {
      const pikachu = await json("/pokemon/Pikachu", "/pokemon/{idOrName}");
      expect(pikachu.id).toBe(25);
    });

    // PokeAPI rejects these with a 403, which servers used to pass on as 502.
    test.each(["%C2%84", "%13", "a%20b", "1.5", "+5"])("name that can't exist (%s) is 404", async (name) => {
      expect((await get(`/pokemon/${name}`)).status).toBe(404);
    });

    test("/pokemon/.. never serves or stores a Pokémon", async () => {
      // Servers used to fetch PokeAPI's index page for this and store it as
      // a blank Pokémon with id 0. Either a 404 or resolving ".." to "/"
      // (standard URL normalisation) is fine. fetch would normalise ".."
      // itself, so send the path as-is.
      const url = new URL(BASE_URL);
      const res = await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const req = httpGet({ host: url.hostname, port: url.port || 80, path: "/pokemon/%2E%2E" }, (r) => {
          let body = "";
          r.setEncoding("utf8");
          r.on("data", (chunk) => (body += chunk));
          r.on("end", () => resolve({ status: r.statusCode ?? 0, body }));
        });
        req.on("error", reject);
      });
      if (res.status !== 404) expect(res).toEqual({ status: 200, body: "Hello, World!" });
      const dex: { id: number }[] = await json("/pokedex");
      expect(dex.filter((e) => e.id < 1)).toEqual([]);
    });
  });

  describe("varieties", () => {
    type Variety = {
      id: number;
      name: string;
      form_name: string;
      is_default: boolean;
      species_description: string;
      types: string[];
      abilities: { name: string }[];
      sprites: { front_default: string | null };
    };
    const byName = (varieties: Variety[], name: string) => varieties.find((v) => v.name === name);

    test("a species with one form has no varieties", async () => {
      const bulbasaur = await json("/pokemon/1", "/pokemon/{idOrName}");
      expect(bulbasaur.varieties).toEqual([]);
      expect(bulbasaur.form_name).toBe("");
    });

    test("the default form lists its other forms in full", async () => {
      const vulpix = await json("/pokemon/vulpix", "/pokemon/{idOrName}");
      expect(vulpix.types).toEqual(["fire"]);
      const alola = byName(vulpix.varieties, "vulpix-alola");
      expect(alola).toBeDefined();
      expect(alola!.id).toBe(10103);
      expect(alola!.is_default).toBe(false);
      expect(alola!.form_name).toBe("Alolan Form");
      expect(alola!.types).toEqual(["ice"]);
      expect(alola!.abilities.map((a) => a.name)).toContain("snow-cloak");
      expect(alola!.sprites.front_default).toBeString();
      // Its description is its own, not the fire Vulpix's.
      expect(alola!.species_description).not.toBe(vulpix.species_description);
    });

    test("an alternate form lists the default form and never itself", async () => {
      const alola = await json("/pokemon/vulpix-alola", "/pokemon/{idOrName}");
      expect(alola.id).toBe(10103);
      expect(alola.form_name).toBe("Alolan Form");
      const vulpix = byName(alola.varieties, "vulpix");
      expect(vulpix?.is_default).toBe(true);
      expect(vulpix?.id).toBe(37);
      expect(alola.varieties.map((v: Variety) => v.id)).not.toContain(10103);
    });

    test("a form looks the same fetched directly or as a variety", async () => {
      const [vulpix, alola] = await Promise.all([
        json("/pokemon/37", "/pokemon/{idOrName}"),
        json("/pokemon/10103", "/pokemon/{idOrName}"),
      ]);
      const asVariety = byName(vulpix.varieties, "vulpix-alola")!;
      expect(asVariety.species_description).toBe(alola.species_description);
      expect(asVariety.form_name).toBe(alola.form_name);
      expect(asVariety.types).toEqual(alola.types);
      expect(asVariety.abilities).toEqual(alola.abilities);
      expect(asVariety.sprites).toEqual(alola.sprites);
    });

    test("forms are stored once each", async () => {
      await json("/pokemon/vulpix", "/pokemon/{idOrName}");
      await json("/pokemon/vulpix-alola", "/pokemon/{idOrName}");
      const ids: number[] = (await json("/pokedex")).map((e: { id: number }) => e.id);
      expect(ids.filter((id) => id === 37)).toHaveLength(1);
      expect(ids.filter((id) => id === 10103)).toHaveLength(1);
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
