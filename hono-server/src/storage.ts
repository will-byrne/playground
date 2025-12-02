import { type Ability, MainClient, PokemonSprites } from 'pokenode-ts';
import { MongoClient } from 'mongodb';

const api = new MainClient();
const mongoClient = new MongoClient('mongodb://admin:testtest@localhost:27017');
const mongoDB = mongoClient.db('pokemon');
const pokemonCollection = mongoDB.collection<PokeboxEntry>('pokemon');

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

export const getPokemonById = async (id: number): Promise<PokeboxEntry> => {
  let pokeboxEntry: PokeboxEntry | null = await pokemonCollection.findOne({ id });

  if(!pokeboxEntry) {
    try {
      const pokemon = await api.pokemon.getPokemonById(id);
      const abilities: Ability[] = await Promise.all(pokemon.abilities.map(async ({ability}) => {
        const abilityResult = await api.pokemon.getAbilityByName(ability.name);
        return abilityResult;
      }));
      const species = await api.pokemon.getPokemonSpeciesByName(pokemon.species.name);
      const species_description = species.flavor_text_entries.find((entry) => entry.language.name === "en")?.flavor_text;
      if (!species_description) throw new Error("Unable to retrieve species");

      const newPokeboxEntry: PokeboxEntry = {
        id: pokemon.id,
        name: pokemon.name,
        species_description,
        types: pokemon.types.map(({ type }) => type.name),
        sprites: pokemon.sprites,
        abilities: abilities.map(({ name, flavor_text_entries, effect_entries}) => ({
          name, 
          flavour_text: flavor_text_entries.find(({language}) => language.name === "en")?.flavor_text || "",
          effect: effect_entries.find(({language}) => language.name === "en")?.effect || "",
        })),
      }
      
      await pokemonCollection.insertOne(newPokeboxEntry);

      return newPokeboxEntry
    } catch (error) {
      console.log(`Could not find Pokemon with id: ${id}: ${error}`);
      throw error;
    }
  } else {
    return pokeboxEntry;
  }
};

export const getPokedex = async (): Promise<{ id: number, name: string }[]> => {
  return await pokemonCollection.find<{ id: number, name: string }>({}, { projection: { _id: 0, id: 1, name: 1 } }).toArray();
}
