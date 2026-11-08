import { describe, expect, it } from "bun:test";
import { FetchError, TEXT, fetchPokemon, getFetchErrorKind } from "./pokedex.ts";

const respond = (status: number) => (async () => new Response("", { status })) as unknown as typeof fetch;

const kindFor = async (fetcher: typeof fetch) => {
	try {
		await fetchPokemon("rust", "1", fetcher);
	} catch (error) {
		return getFetchErrorKind(error);
	}
	throw new Error("expected a rejection");
};

describe("getFetchErrorKind", () => {
	it("maps the server statuses to kinds", async () => {
		expect(await kindFor(respond(404))).toBe("not-found");
		expect(await kindFor(respond(502))).toBe("upstream");
		expect(await kindFor(respond(500))).toBe("server");
		expect(await kindFor(respond(503))).toBe("server");
	});

	it("treats a failed connection as unreachable", async () => {
		const offline = (async () => {
			throw new TypeError("fetch failed");
		}) as unknown as typeof fetch;
		expect(await kindFor(offline)).toBe("unreachable");
	});

	it("treats an invalid JSON body as a server error", () => {
		expect(getFetchErrorKind(new SyntaxError("Unexpected token"))).toBe("server");
	});

	it("reads the status from non-FetchError errors such as Angular's HttpErrorResponse", () => {
		expect(getFetchErrorKind({ status: 404 })).toBe("not-found");
		expect(getFetchErrorKind({ status: 0 })).toBe("unreachable");
		expect(getFetchErrorKind(new FetchError(502, "x", "Bad Gateway"))).toBe("upstream");
	});
});

describe("error text", () => {
	it("only calls a 404 'not found'", () => {
		expect(TEXT.pokemonErrorTitle("not-found")).toBe("Pokémon Not Found");
		expect(TEXT.pokemonErrorTitle("upstream")).toBe("Could Not Load Pokémon");
		expect(TEXT.pokemonError("pikachu", "rust", "upstream")).toContain("PokeAPI");
		expect(TEXT.pokemonError("pikachu", "rust", "server")).toContain("database");
	});

	it("says random-new is exhausted on a 404", () => {
		expect(TEXT.randomError("rust", "not-found")).toContain("already been discovered");
		expect(TEXT.randomError("rust", "unreachable")).toContain("Could not connect to the Rust backend");
	});
});
