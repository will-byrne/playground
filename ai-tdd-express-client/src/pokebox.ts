import { Ability } from "pokenode-ts";
import { pokemonService } from "./pokemon-service";
import { storage } from "./storage";
import { PokeboxEntry } from ".";

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
      if (!abilities) throw new Error("Unable to retrieve abilities");
      const species = await pokemonService.getSpecies(pokemon);
      const species_description = species.flavor_text_entries.find((entry) => entry.language.name === "en")?.flavor_text;
      if (!species_description) throw new Error("Unable to retrieve species description");

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
      throw new Error(`Could not find Pokemon with id: ${idOrString}: ${error}`);
    }
  } else {
    return pokeboxEntry;
  }
};


export const getPokedex = async (): Promise<{ id: number, name: string }[]> => {
  return await storage.getPokedex();
}
