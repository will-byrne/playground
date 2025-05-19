import { type Pokemon, type Ability, MainClient, type PokemonSpecies, Move, NamedAPIResource } from 'pokenode-ts';
import { MongoClient, Collection } from 'mongodb';

const api = new MainClient();
const mongoClient = new MongoClient('mongodb://admin:testtest@localhost:27017');
const mongoDB = mongoClient.db('pokemon');
const pokemonCollection = mongoDB.collection<Pokemon>('pokemon');
const abilityCollection = mongoDB.collection<{ _id: string} & Ability>('abilities');
const speciesCollection = mongoDB.collection<{ _id: string} & PokemonSpecies>('species');
const movesCollection = mongoDB.collection<{ _id: string} & Move>('moves');

// const getExtraResourceFromNameArray = async <T>(names: NamedAPIResource[], getter: (s: string) => Promise<T>): Promise<T[]> => {
//   let results: T[] = [];
//   await Promise.all(names.map(async ({ name, url }) => {
//     const getterResult = await getter(name);
//     results.push(getterResult);
//   }));
//   return results;
// }

export const getPokemonById = async (id: number): Promise<{ pokemon: Pokemon, abilities: Ability[], species: PokemonSpecies, moves: Move[]}> => {
  let pokemon: Pokemon | null = (await pokemonCollection.findOne({ id }));

  if(!pokemon) {
    console.log(`Pokemon with id: ${id} not found in cache, fetching from API`);
    try {
      pokemon = await api.pokemon.getPokemonById(id);
      const abilities: Ability[] = await Promise.all(pokemon.abilities.map(async ({ability}) => {
        const abilityResult = await api.pokemon.getAbilityByName(ability.name);
        await abilityCollection.replaceOne({
          _id: ability.name,
        }, abilityResult, {
          upsert: true,
        });
        return abilityResult;
      }));
      const moves: Move[] = await Promise.all(pokemon.moves.map(async ({move}) => {
        const moveResult = await api.move.getMoveByName(move.name);
        await movesCollection.replaceOne({
              _id: move.name,
            }, moveResult, {
          upsert: true,
        });
        return moveResult;
      }));
      const species = await api.pokemon.getPokemonSpeciesByName(pokemon.species.name);
      await speciesCollection.replaceOne({
          _id: pokemon.species.name,
        }, species, {
          upsert: true
        });
      await pokemonCollection.insertOne(pokemon);

      return {
        pokemon, abilities, species, moves
      }
    } catch (error) {
      console.log(`Could not find Pokemon with id: ${id}: ${error}`);
      throw error;
    }
  } else {
    console.log(`Pokemon with id: ${id} found in cache`);
    const species = await speciesCollection.findOne({ _id: pokemon.species.name });
    if (!species) {
      throw new Error(`Could not find species for Pokemon with id: ${id}`);
    }

    const abilities = await abilityCollection.find({ _id: { $in: pokemon.abilities.map(({ability: { name }}) => name) } }).toArray();
    const moves = await movesCollection.find({ _id: { $in: pokemon.moves.map(({move: { name }}) => name) } }).toArray();
    return { pokemon, abilities, species, moves };
  }
};

export const getPokedex = async (): Promise<{ id: number, name: string }[]> => {
  return await pokemonCollection.find<{ id: number, name: string }>({}, { projection: { _id: 0, id: 1, name: 1 } }).toArray();
}
