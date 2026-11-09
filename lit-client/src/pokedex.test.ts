// Tests for the shared Pokédex helpers. Like pokedex.ts, this file is copied
// verbatim into every web client. Keep the copies in sync.

import { describe, expect, it } from "vitest";
import {
  DEX_MAX,
  FetchError,
  TEXT,
  canGoToNext,
  canGoToPrevious,
  capitalize,
  fetchPokedex,
  fetchPokemon,
  fetchRandomNewPokemon,
  formatDescription,
  formatDexNo,
  formatSpriteName,
  getBackend,
  getBackendFromSearch,
  getBackendSearch,
  getClientLinks,
  getDefaultSpriteKey,
  getDisplaySpriteKey,
  getFeaturedPokemon,
  getFetchErrorKind,
  getForms,
  getLeftToDiscover,
  getShinySpriteKey,
  getSprites,
  getTypeColor,
  homePath,
  parseRoute,
  pokemonPath,
  searchPokedex,
  sortPokedex,
  type PokeboxEntry,
} from "./pokedex.js";
import { bulbasaur, pokedex, vulpix } from "./pokedex.fixtures.js";

/** A fetch that answers every request with `status` and `body`, recording the URLs asked for. */
const respond = (status: number, body: unknown = "") => {
  const urls: string[] = [];
  const fetcher = (async (url: string) => {
    urls.push(url);
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { fetcher, urls };
};

const kindOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return getFetchErrorKind(error);
  }
  throw new Error("expected a rejection");
};

describe("backends", () => {
  it("falls back to the default backend for unknown values", () => {
    expect(getBackend("rust")).toBe("rust");
    expect(getBackend("cobol")).toBe("elysia");
    expect(getBackend(null)).toBe("elysia");
    expect(getBackend("toString")).toBe("elysia");
  });

  it("only puts a non-default backend in the URL", () => {
    expect(getBackendSearch("elysia")).toBe("");
    expect(getBackendSearch("go")).toBe("?backend=go");
    expect(getBackendFromSearch("?backend=java")).toBe("java");
    expect(getBackendFromSearch("")).toBe("elysia");
  });
});

describe("API", () => {
  it("asks the chosen backend for a Pokémon, escaping the id or name", async () => {
    const { fetcher, urls } = respond(200, vulpix);
    expect(await fetchPokemon("rust", "mr mime", fetcher)).toEqual(vulpix);
    expect(urls).toEqual(["http://localhost:3000/pokemon/mr%20mime"]);
  });

  it("returns the pokedex sorted by id", async () => {
    const { fetcher, urls } = respond(200, pokedex);
    expect((await fetchPokedex("go", fetcher)).map(({ id }) => id)).toEqual([1, 25, 37, 151]);
    expect(urls).toEqual(["http://localhost:3002/pokedex"]);
  });

  it("asks for a random new Pokémon", async () => {
    const { fetcher, urls } = respond(200, bulbasaur);
    expect(await fetchRandomNewPokemon("hono", fetcher)).toEqual(bulbasaur);
    expect(urls).toEqual(["http://localhost:3003/pokemon/random-new"]);
  });

  it("maps the server statuses to error kinds", async () => {
    expect(await kindOf(fetchPokemon("rust", "1", respond(404).fetcher))).toBe("not-found");
    expect(await kindOf(fetchPokemon("rust", "1", respond(502).fetcher))).toBe("upstream");
    expect(await kindOf(fetchPokemon("rust", "1", respond(500).fetcher))).toBe("server");
    expect(await kindOf(fetchPokemon("rust", "1", respond(503).fetcher))).toBe("server");
  });

  it("treats a failed connection as unreachable", async () => {
    const offline = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect(await kindOf(fetchPokemon("rust", "1", offline))).toBe("unreachable");
  });

  it("treats an invalid JSON body as a server error", async () => {
    expect(await kindOf(fetchPokemon("rust", "1", respond(200, "<html>").fetcher))).toBe("server");
  });

  it("reads the status from other errors, such as Angular's HttpErrorResponse", () => {
    expect(getFetchErrorKind({ status: 404 })).toBe("not-found");
    expect(getFetchErrorKind({ status: 0 })).toBe("unreachable");
    expect(getFetchErrorKind(new FetchError(502, "x", "Bad Gateway"))).toBe("upstream");
  });
});

describe("error text", () => {
  it("only calls a 404 'not found'", () => {
    expect(TEXT.pokemonErrorTitle("not-found")).toBe("Pokémon Not Found");
    expect(TEXT.pokemonErrorTitle("server")).toBe("Could Not Load Pokémon");
    expect(TEXT.pokemonError("missingno", "rust", "not-found")).toBe(
      'The Pokémon "missingno" could not be found.',
    );
  });

  it("names the backend and what went wrong", () => {
    expect(TEXT.pokemonError("1", "go", "server")).toContain("Go backend ran into a problem");
    expect(TEXT.pokemonError("1", "hono", "upstream")).toContain("Hono backend could not reach PokeAPI");
    expect(TEXT.pokedexError("java", "unreachable")).toContain("Could not connect to the Java backend");
  });

  it("says random-new is exhausted on a 404", () => {
    expect(TEXT.randomError("rust", "not-found")).toContain("already been discovered");
    expect(TEXT.randomError("rust", "server")).toContain("Could not find a random new Pokémon");
  });
});

describe("formatting", () => {
  it("pads dex numbers to three digits", () => {
    expect(formatDexNo(1)).toBe("#001");
    expect(formatDexNo(37)).toBe("#037");
    expect(formatDexNo(1025)).toBe("#1025");
  });

  it("joins PokeAPI's line and page breaks into one line", () => {
    expect(formatDescription(bulbasaur.species_description)).toBe(
      "A strange seed was planted on its back at birth.",
    );
  });

  it("capitalizes and spaces names", () => {
    expect(capitalize("vulpix")).toBe("Vulpix");
    expect(formatSpriteName("official-artwork-front_default")).toBe("official artwork front default");
  });

  it("colours known types and falls back for unknown ones", () => {
    expect(getTypeColor("Fire").background).toBe("#ef4444");
    expect(getTypeColor("shadow").background).toBe("#9ca3af");
  });
});

describe("pokedex", () => {
  it("sorts without changing the original", () => {
    const copy = [...pokedex];
    expect(sortPokedex(pokedex).map(({ id }) => id)).toEqual([1, 25, 37, 151]);
    expect(pokedex).toEqual(copy);
  });

  it("searches by name or number, ignoring case and spaces", () => {
    expect(searchPokedex(pokedex, " VUL ").map(({ name }) => name)).toEqual(["vulpix"]);
    expect(searchPokedex(pokedex, "15").map(({ name }) => name)).toEqual(["mew"]);
    expect(searchPokedex(pokedex, "  ")).toEqual([]);
  });

  it("features the stored Pokémon from the featured list", () => {
    expect(getFeaturedPokemon(pokedex).map(({ id }) => id)).toEqual([37, 151]);
  });

  it("counts what's left to discover", () => {
    expect(getLeftToDiscover(pokedex)).toBe(DEX_MAX - 4);
  });

  it("only links to dex numbers that exist", () => {
    expect([canGoToPrevious(1), canGoToPrevious(2)]).toEqual([false, true]);
    expect([canGoToNext(DEX_MAX), canGoToNext(DEX_MAX - 1)]).toEqual([false, true]);
  });
});

describe("sprites", () => {
  const sprites = getSprites(bulbasaur.sprites);

  it("flattens nested sprites and drops missing ones", () => {
    expect(Object.keys(sprites)).toEqual([
      "front_default",
      "front_shiny",
      "back_default",
      "official-artwork-front_default",
      "official-artwork-front_shiny",
    ]);
  });

  it("prefers the official artwork, then the plain front sprite", () => {
    expect(getDefaultSpriteKey(sprites)).toBe("official-artwork-front_default");
    expect(getDefaultSpriteKey({ back_default: "b", front_default: "f" })).toBe("front_default");
    expect(getDefaultSpriteKey({})).toBe("");
  });

  it("finds the shiny version of a sprite when there is one", () => {
    expect(getShinySpriteKey(sprites, "front_default")).toBe("front_shiny");
    expect(getShinySpriteKey(sprites, "back_default")).toBeUndefined();
    expect(getDisplaySpriteKey(sprites, "front_default", true)).toBe("front_shiny");
    expect(getDisplaySpriteKey(sprites, "back_default", true)).toBe("back_default");
    expect(getDisplaySpriteKey(sprites, "front_default", false)).toBe("front_default");
  });
});

describe("forms", () => {
  it("is just the entry, as the default form, when there are no varieties", () => {
    const forms = getForms(bulbasaur);
    expect(forms.map((f) => [f.id, f.label, f.is_default])).toEqual([[1, TEXT.defaultForm, true]]);
  });

  it("lists the default form first, then the others in the server's order", () => {
    expect(getForms(vulpix).map((f) => [f.id, f.label])).toEqual([
      [37, TEXT.defaultForm],
      [10103, "Alolan Form"],
    ]);
  });

  it("puts the default form first from an alternate form's page", () => {
    const [alola] = vulpix.varieties;
    const { is_default: _, ...rest } = alola;
    const { varieties: __, ...self } = vulpix;
    const fromAlola: PokeboxEntry = { ...rest, varieties: [{ ...self, is_default: true }] };
    const forms = getForms(fromAlola);
    expect(forms.map((f) => [f.id, f.label])).toEqual([
      [37, TEXT.defaultForm],
      [10103, "Alolan Form"],
    ]);
    expect(forms[1].types).toEqual(["ice"]);
  });

  it("labels a form without a form name by its name", () => {
    const [alola] = vulpix.varieties;
    const forms = getForms({ ...vulpix, varieties: [{ ...alola, form_name: "" }] });
    expect(forms[1].label).toBe("Vulpix alola");
  });

  it("treats an entry from a server without varieties as one form", () => {
    const { varieties: _, form_name: __, ...old } = bulbasaur;
    const forms = getForms(old as PokeboxEntry);
    expect(forms).toHaveLength(1);
    expect(forms[0].form_name).toBe("");
  });
});

describe("routing", () => {
  it("parses the home and Pokémon routes", () => {
    expect(parseRoute("/")).toEqual({ page: "home" });
    expect(parseRoute("/pokemon/mr%20mime")).toEqual({ page: "pokemon", idOrName: "mr mime" });
    expect(parseRoute("/pokemon/25/")).toEqual({ page: "pokemon", idOrName: "25" });
    expect(parseRoute("/elsewhere")).toEqual({ page: "home" });
  });

  it("builds paths that keep the backend", () => {
    expect(homePath("elysia")).toBe("/");
    expect(homePath("rust")).toBe("/?backend=rust");
    expect(pokemonPath("mr mime", "go")).toBe("/pokemon/mr%20mime?backend=go");
    expect(pokemonPath(25, "elysia")).toBe("/pokemon/25");
  });

  it("links to every client at the same path, marking the current one", () => {
    const links = getClientLinks("react", "/pokemon/25?backend=rust");
    expect(links).toHaveLength(7);
    expect(links.find((link) => link.current)?.client).toBe("react");
    expect(links.find((link) => link.client === "lit")?.href).toBe("http://localhost:4002/pokemon/25?backend=rust");
  });
});
