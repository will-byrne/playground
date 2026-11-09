// Shared test data. Like pokedex.ts, this file is copied verbatim into every
// web client (angular, lit, mantine, react, remix, svelte, tsrx) next to
// pokedex.ts, and used by pokedex.test.ts and pokemon-detail.cases.ts. Keep
// the copies in sync.

import type { PokeboxEntry, PokedexEntry } from "./pokedex.js";

const sprite = (id: number, key: string) => `https://img.test/${id}/${key}.png`;

/** A species with one form. */
export const bulbasaur: PokeboxEntry = {
  id: 1,
  name: "bulbasaur",
  form_name: "",
  species_description: "A strange seed was\nplanted on its\fback at birth.",
  types: ["grass", "poison"],
  abilities: [
    { name: "overgrow", flavour_text: "Ups GRASS moves in a pinch.", effect: "Strengthens grass moves." },
    { name: "chlorophyll", flavour_text: "Raises SPEED in sunshine.", effect: "Doubles Speed in sunlight." },
  ],
  sprites: {
    front_default: sprite(1, "front_default"),
    front_shiny: sprite(1, "front_shiny"),
    back_default: sprite(1, "back_default"),
    front_female: null,
    other: {
      "official-artwork": {
        front_default: sprite(1, "official-artwork-front_default"),
        front_shiny: sprite(1, "official-artwork-front_shiny"),
      },
    },
  },
  varieties: [],
};

/** A species with an alternate form that has different types, abilities, text and sprites. */
export const vulpix: PokeboxEntry = {
  id: 37,
  name: "vulpix",
  form_name: "",
  species_description: "At the time of birth, it has\njust one tail.",
  types: ["fire"],
  abilities: [{ name: "flash-fire", flavour_text: "Powers up fire moves.", effect: "Absorbs fire moves." }],
  sprites: {
    front_default: sprite(37, "front_default"),
    front_shiny: sprite(37, "front_shiny"),
    back_default: sprite(37, "back_default"),
    other: {
      "official-artwork": {
        front_default: sprite(37, "official-artwork-front_default"),
        front_shiny: sprite(37, "official-artwork-front_shiny"),
      },
    },
  },
  varieties: [
    {
      id: 10103,
      name: "vulpix-alola",
      form_name: "Alolan Form",
      is_default: false,
      species_description: "It exhales air colder than\n-58 degrees Fahrenheit.",
      types: ["ice"],
      abilities: [
        { name: "snow-cloak", flavour_text: "Raises evasion in a hailstorm.", effect: "Increases evasion during hail." },
      ],
      sprites: {
        front_default: sprite(10103, "front_default"),
        other: { "official-artwork": { front_default: sprite(10103, "official-artwork-front_default") } },
      },
    },
  ],
};

export const pokedex: PokedexEntry[] = [
  { id: 37, name: "vulpix" },
  { id: 1, name: "bulbasaur" },
  { id: 25, name: "pikachu" },
  { id: 151, name: "mew" },
];
