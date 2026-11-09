// The data WireMock serves, so the specs can expect exactly what's on screen.

import { readFileSync } from "node:fs";
import type { PokeboxEntry, PokedexEntry } from "./pokedex.ts";

const read = <T>(name: string): T =>
  JSON.parse(readFileSync(new URL(`../wiremock/__files/${name}`, import.meta.url), "utf8"));

export const pokedex = read<PokedexEntry[]>("pokedex.json");
export const bulbasaur = read<PokeboxEntry>("pokemon-1.json");
export const ivysaur = read<PokeboxEntry>("pokemon-2.json");
/** What random-new returns. */
export const pikachu = read<PokeboxEntry>("pokemon-25.json");
export const vulpix = read<PokeboxEntry>("pokemon-37.json");
