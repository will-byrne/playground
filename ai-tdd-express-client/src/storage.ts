import { MongoClient } from 'mongodb';
import { PokeboxEntry } from './pokebox';

const mongoClient = new MongoClient('mongodb://admin:testtest@localhost:27017');
const mongoDB = mongoClient.db('pokemon');
const pokemonCollection = mongoDB.collection<PokeboxEntry>('pokemon');

const storePokemon = async (pokemon: PokeboxEntry): Promise<void> => {
  await pokemonCollection.insertOne(pokemon);
};

const getPokemonById = async (id: number): Promise<PokeboxEntry | null> => {
  return await pokemonCollection.findOne({ id });
};

const getPokemonByName = async (name: string): Promise<PokeboxEntry | null> => {
  return await pokemonCollection.findOne({ name });
};

const getPokedex = async (): Promise<{ id: number, name: string }[]> => {
  return await pokemonCollection.find<{ id: number, name: string }>({}, { projection: { _id: 0, id: 1, name: 1 } }).toArray();
}

export const storage = {
  storePokemon,
  getPokemonById,
  getPokemonByName,
  getPokedex,
};