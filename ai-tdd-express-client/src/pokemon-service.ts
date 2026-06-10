import { type Ability, MainClient, Pokemon, PokemonSpecies } from 'pokenode-ts';

const api = new MainClient();

const getPokemon = async (idOrName: number | string): Promise<Pokemon> => {
  if (!isNaN(Number(idOrName))) {
    return await api.pokemon.getPokemonById(Number(idOrName));
  } else {
    return await api.pokemon.getPokemonByName(String(idOrName));
  }
};

const getAbilities = async (pokemon: Pokemon): Promise<Ability[]> => {
  return await Promise.all(pokemon.abilities.map(async ({ ability }) => {
    const abilityResult = await api.pokemon.getAbilityByName(ability.name);
    return abilityResult;
  }));
};

const getSpecies = async (pokemon: Pokemon): Promise<PokemonSpecies> => {
  return await api.pokemon.getPokemonSpeciesByName(pokemon.species.name);
};

export const pokemonService = {
  getPokemon: getPokemon,
  getAbilities: getAbilities,
  getSpecies: getSpecies,
};