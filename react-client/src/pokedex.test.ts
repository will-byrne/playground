import { describe, expect, it } from "bun:test";
import {
	FetchError,
	type PokeboxEntry,
	type PokemonVariety,
	TEXT,
	fetchPokemon,
	getFetchErrorKind,
	getForms,
} from "./pokedex.ts";

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

describe("getForms", () => {
	const form = (id: number, name: string, form_name: string, is_default: boolean): PokemonVariety => ({
		id,
		name,
		form_name,
		is_default,
		species_description: `${name} text`,
		types: ["normal"],
		abilities: [],
		sprites: { front_default: `${id}.png` },
	});
	const entry = ({ is_default: _, ...self }: PokemonVariety, varieties: PokemonVariety[]): PokeboxEntry => ({
		...self,
		varieties,
	});

	it("is just the entry, labelled as the default form, when there are no varieties", () => {
		const forms = getForms(entry(form(1, "bulbasaur", "", true), []));
		expect(forms.map((f) => [f.id, f.label, f.is_default])).toEqual([[1, TEXT.defaultForm, true]]);
	});

	it("puts the default form first from an alternate form's page", () => {
		const forms = getForms(entry(form(10103, "vulpix-alola", "Alolan Form", false), [form(37, "vulpix", "", true)]));
		expect(forms.map((f) => [f.id, f.label])).toEqual([
			[37, TEXT.defaultForm],
			[10103, "Alolan Form"],
		]);
		expect(forms[1].species_description).toBe("vulpix-alola text");
	});

	it("keeps the server's order for the other forms", () => {
		const forms = getForms(
			entry(form(6, "charizard", "", true), [
				form(10034, "charizard-mega-x", "Mega Charizard X", false),
				form(10035, "charizard-mega-y", "Mega Charizard Y", false),
			]),
		);
		expect(forms.map((f) => f.label)).toEqual([TEXT.defaultForm, "Mega Charizard X", "Mega Charizard Y"]);
	});

	it("labels a form without a form name by its name", () => {
		const forms = getForms(entry(form(1, "a", "", true), [form(2, "a-b_c", "", false)]));
		expect(forms[1].label).toBe("A b c");
	});

	it("treats an entry from a server without varieties as one form", () => {
		const { varieties: _, form_name: __, ...old } = entry(form(1, "bulbasaur", "", true), []);
		const forms = getForms(old as PokeboxEntry);
		expect(forms).toHaveLength(1);
		expect(forms[0].form_name).toBe("");
	});
});
