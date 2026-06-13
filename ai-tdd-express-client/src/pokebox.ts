import { Ability, PokemonSprites } from "pokenode-ts";
import { pokemonService } from "./pokemon-service";
import { storage } from "./storage";

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

export const getPokemon = async (idOrString: number | string): Promise<PokeboxEntry> => {
  let pokeboxEntry: PokeboxEntry | null;
  if (!isNaN(Number(idOrString))) {
     pokeboxEntry = await storage.getPokemonById(Number(idOrString));
  } else {
    pokeboxEntry = await storage.getPokemonByName(String(idOrString));
  }

  if (!pokeboxEntry) {
    try {
      const pokemon = await pokemonService.getPokemon(idOrString);
      const abilities: Ability[] = await pokemonService.getAbilities(pokemon);
      const species = await pokemonService.getSpecies(pokemon);
      const species_description = species.flavor_text_entries.find((entry) => entry.language.name === "en")?.flavor_text;
      if (!species_description) throw new Error("Unable to retrieve species");

      const newPokeboxEntry: PokeboxEntry = {
        id: pokemon.id,
        name: pokemon.name,
        species_description,
        types: pokemon.types.map(({ type }) => type.name),
        sprites: pokemon.sprites,
        abilities: abilities.map(({ name, flavor_text_entries, effect_entries }) => ({
          name,
          flavour_text: flavor_text_entries.find(({ language }) => language.name === "en")?.flavor_text || "",
          effect: effect_entries.find(({ language }) => language.name === "en")?.effect || "",
        })),
      }

      await storage.storePokemon(newPokeboxEntry);

      return newPokeboxEntry
    } catch (error) {
      console.log(`Could not find Pokemon with id: ${idOrString}: ${error}`);
      throw error;
    }
  } else {
    return pokeboxEntry;
  }
};


export const getPokedex = async (): Promise<{ id: number, name: string }[]> => {
  return await storage.getPokedex();
}
