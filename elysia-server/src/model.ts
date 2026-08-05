import { PokemonSprites } from "pokenode-ts"

export type PokeboxEntry = {
  id: number,
  name: string,
  species_description: string,
  types: string[],
  sprites: PokemonSprites,
  abilities: {
    name: string,
    flavour_text: string,
    effect: string,
  }[]
}

export type PokedexEntry = {
  id: number,
  name: string
}
