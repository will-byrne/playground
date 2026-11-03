import { type Ability, MainClient, type Pokemon, type PokemonSprites } from 'pokenode-ts';
import { MongoClient } from 'mongodb';

const api = new MainClient();
const mongoClient = new MongoClient(process.env.MONGODB_URI ?? 'mongodb://admin:testtest@localhost:27017');
const mongoDB = mongoClient.db('pokemon');
const pokemonCollection = mongoDB.collection<PokeboxEntry>('pokemon');

export type PokeboxEntry = {
  name: string,
  id: number,
  species_description: string,
  types: string[],
  abilities: {
    name: string,
    flavour_text: string,
    effect: string,
  }[],
  sprites: PokemonSprites,
}

export type PokedexEntry = { name: string, id: number };

const findEnglish = <T extends { language: { name: string } }>(entries: T[]) =>
  entries.find(({ language }) => language.name === 'en');

const buildPokeboxEntry = async (pokemon: Pokemon): Promise<PokeboxEntry> => {
  // Like rust-server, abilities that fail to load are skipped rather than failing the request.
  const abilities: Ability[] = (
    await Promise.allSettled(pokemon.abilities.map(({ ability }) => api.pokemon.getAbilityByName(ability.name)))
  ).flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));

  const species = await api.pokemon.getPokemonSpeciesByName(pokemon.species.name);

  return {
    name: pokemon.name,
    id: pokemon.id,
    species_description: findEnglish(species.flavor_text_entries)?.flavor_text ?? 'No description available',
    types: pokemon.types.map(({ type }) => type.name),
    abilities: abilities.map(({ name, flavor_text_entries, effect_entries }) => ({
      name,
      flavour_text: findEnglish(flavor_text_entries)?.flavor_text ?? 'No description available',
      effect: findEnglish(effect_entries)?.short_effect ?? 'No effect available',
    })),
    sprites: pokemon.sprites,
  };
};

const getPokemon = async (
  filter: { id: number } | { name: string },
  fetchFromApi: () => Promise<Pokemon>,
): Promise<PokeboxEntry> => {
  const cached = await pokemonCollection.findOne(filter, { projection: { _id: 0 } });
  if (cached) return cached;

  const entry = await buildPokeboxEntry(await fetchFromApi());
  try {
    // insertOne adds `_id` to the document it is given, so insert a copy to keep it out of the response.
    await pokemonCollection.insertOne({ ...entry });
  } catch (error) {
    console.error(`Failed to store Pokemon ${entry.name}: ${error}`);
  }
  return entry;
};

export const getPokemonById = (id: number): Promise<PokeboxEntry> =>
  getPokemon({ id }, () => api.pokemon.getPokemonById(id));

export const getPokemonByName = (name: string): Promise<PokeboxEntry> =>
  getPokemon({ name }, () => api.pokemon.getPokemonByName(name));

export const getPokedex = async (): Promise<PokedexEntry[]> => {
  try {
    const entries = await pokemonCollection
      .find<PokedexEntry>({ id: { $exists: true } }, { projection: { _id: 0, id: 1, name: 1 } })
      .sort({ id: 1 })
      .toArray();
    return entries.map(({ name, id }) => ({ name, id }));
  } catch (error) {
    console.error(`get_pokedex failed: ${error}`);
    return [];
  }
};
