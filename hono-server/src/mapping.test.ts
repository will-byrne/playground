import { describe, expect, it } from "bun:test";
import type { Ability, Pokemon, PokemonSpecies } from "pokenode-ts";
import { type FetchedPokemon, type FormText, toPokeboxEntry } from "./mapping";

// Trimmed PokeAPI responses for Vulpix and Alolan Vulpix: only the fields the
// mapping reads, with real values.
const en = { name: "en", url: "" };
const ja = { name: "ja", url: "" };

const ability = (name: string, flavor: string, effect: string) =>
  ({
    name,
    flavor_text_entries: [{ flavor_text: flavor, language: en }],
    effect_entries: [{ short_effect: effect, language: en }],
  }) as unknown as Ability;

const pokemon = (id: number, name: string, types: string[], isDefault: boolean) =>
  ({
    id,
    name,
    is_default: isDefault,
    types: types.map((type, i) => ({ slot: i + 1, type: { name: type, url: "" } })),
    sprites: { front_default: `https://example.com/${id}.png` },
    species: { name: "vulpix", url: "" },
  }) as unknown as Pokemon;

const species = {
  flavor_text_entries: [
    { flavor_text: "Vulpixの説明", language: ja },
    { flavor_text: "At the time of birth, it has just one tail.", language: en },
  ],
  varieties: [
    { is_default: true, pokemon: { name: "vulpix", url: "" } },
    { is_default: false, pokemon: { name: "vulpix-alola", url: "" } },
  ],
} as unknown as PokemonSpecies;

const vulpix = (): FetchedPokemon => ({
  pokemon: pokemon(37, "vulpix", ["fire"], true),
  abilities: [ability("flash-fire", "Powers up fire moves.", "Absorbs fire moves.")],
  form: { form_names: [], flavor_text_entries: [] },
});

const alolanForm = (): FormText => ({
  form_names: [
    { name: "アローラのすがた", language: ja },
    { name: "Alolan Form", language: en },
  ],
  flavor_text_entries: [
    { flavor_text: "It exhales air colder than -58 degrees Fahrenheit.", language: en },
  ],
});

const alolanVulpix = (): FetchedPokemon => ({
  pokemon: pokemon(10103, "vulpix-alola", ["ice"], false),
  abilities: [
    ability("snow-cloak", "Ups evasion in a hailstorm.", "Increases evasion during hail."),
    ability("snow-warning", "Summons hail.", "Summons hail on entry."),
  ],
  form: alolanForm(),
});

describe("toPokeboxEntry", () => {
  it("has no varieties or form name for a species with one form", () => {
    const entry = toPokeboxEntry(vulpix(), { ...species, varieties: species.varieties.slice(0, 1) }, []);
    expect(entry.varieties).toEqual([]);
    expect(entry.form_name).toBe("");
  });

  it("carries the alternate forms in full", () => {
    const entry = toPokeboxEntry(vulpix(), species, [alolanVulpix()]);
    expect(entry.types).toEqual(["fire"]);
    expect(entry.varieties).toEqual([
      {
        id: 10103,
        name: "vulpix-alola",
        form_name: "Alolan Form",
        is_default: false,
        species_description: "It exhales air colder than -58 degrees Fahrenheit.",
        types: ["ice"],
        abilities: [
          { name: "snow-cloak", flavour_text: "Ups evasion in a hailstorm.", effect: "Increases evasion during hail." },
          { name: "snow-warning", flavour_text: "Summons hail.", effect: "Summons hail on entry." },
        ],
        sprites: { front_default: "https://example.com/10103.png" } as never,
      },
    ]);
  });

  it("keeps the species description for a form without its own", () => {
    const entry = toPokeboxEntry(vulpix(), species, [alolanVulpix()]);
    expect(entry.species_description).toBe("At the time of birth, it has just one tail.");
  });

  it("falls back to the species description when a form's text isn't in English", () => {
    const alola = alolanVulpix();
    alola.form.flavor_text_entries = [{ flavor_text: "…", language: ja }];
    expect(toPokeboxEntry(alola, species, []).species_description).toBe(
      "At the time of birth, it has just one tail.",
    );
  });

  it("lists the default form from an alternate form", () => {
    const entry = toPokeboxEntry(alolanVulpix(), species, [vulpix()]);
    expect(entry.id).toBe(10103);
    expect(entry.form_name).toBe("Alolan Form");
    expect(entry.varieties.map((v) => [v.name, v.is_default])).toEqual([["vulpix", true]]);
  });

  it("describes a form the same directly or as a variety", () => {
    const direct = toPokeboxEntry(alolanVulpix(), species, []);
    const { varieties } = toPokeboxEntry(vulpix(), species, [alolanVulpix()]);
    expect(varieties[0]).toEqual({ ...direct, varieties: undefined, is_default: false } as never);
  });

  it("orders varieties like the species", () => {
    const megas = {
      ...species,
      varieties: [
        ...species.varieties,
        { is_default: false, pokemon: { name: "vulpix-other", url: "" } },
      ],
    } as PokemonSpecies;
    const other = { ...vulpix(), pokemon: pokemon(10999, "vulpix-other", ["fire"], false) };
    const entry = toPokeboxEntry(vulpix(), megas, [other, alolanVulpix()]);
    expect(entry.varieties.map((v) => v.name)).toEqual(["vulpix-alola", "vulpix-other"]);
  });
});
