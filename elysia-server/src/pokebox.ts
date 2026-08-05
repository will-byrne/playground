import { type Ability, MainClient } from 'pokenode-ts';
import { PokeboxEntry, PokedexEntry } from './model';
import { MongoClient } from 'mongodb';

const api = new MainClient();
const mongoClient = new MongoClient('mongodb://admin:testtest@localhost:27017');
const mongoDB = mongoClient.db('pokemon');
const pokemonCollection = mongoDB.collection<PokeboxEntry>('pokemon');

export const getPokemon = async (idOrName: string): Promise<PokeboxEntry> => {
  let pokeboxEntry: PokeboxEntry | null = null;
  let isName = !isNaN(Number(idOrName));
  if (!isName) {
    pokeboxEntry = await pokemonCollection.findOne({ id: Number(idOrName) });
  } else {
    pokeboxEntry = await pokemonCollection.findOne({ name: idOrName });
  }

  if (pokeboxEntry) {
    return pokeboxEntry;
  }
  
  try {
    const pokemon = isName ? await api.pokemon.getPokemonByName(idOrName) : await api.pokemon.getPokemonById(Number(idOrName));
    const abilities: Ability[] = await Promise.all(pokemon.abilities.map(async ({ ability }) => {
      return await api.pokemon.getAbilityByName(ability.name);
    }));
    const species = await api.pokemon.getPokemonSpeciesByName(pokemon.species.name);
    const species_description = species.flavor_text_entries.find((entry) => entry.language.name === "en")?.flavor_text;
    if (!species_description) throw new Error ("Unable to find species");

    const newPokeboxEntry: PokeboxEntry = {
      id: pokemon.id,
      name: pokemon.name,
      species_description,
      types: pokemon.types.map(({ type} ) => type.name),
      sprites: pokemon.sprites,
      abilities: abilities.map(({ name, flavor_text_entries, effect_entries }) => ({
        name,
        flavour_text: flavor_text_entries.find(({ language }) => language.name === "en")?. flavor_text || "",
        effect: effect_entries.find(({ language }) => language.name === "en")?.effect || "",
      })),
    };

    await pokemonCollection.insertOne(newPokeboxEntry);
    return newPokeboxEntry;
  } catch (error) {
    console.log(`Could not find pokemon with id or name: ${idOrName}`);
    throw error;
  }
}

export const getPokedex = async (): Promise<PokedexEntry[]> => {
  return await pokemonCollection.find<PokedexEntry>({}, { projection: { id: 1, name: 1 }}).toArray();
}
