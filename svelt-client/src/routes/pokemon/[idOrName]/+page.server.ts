import type { PageServerLoad } from "./$types";
import { fetchPokemon, getBackendFromSearch, getFetchErrorKind } from "$lib/pokedex";

export const load: PageServerLoad = async ({ params, fetch, url }) => {
  const backend = getBackendFromSearch(url.search);
  try {
    const pokemon = await fetchPokemon(backend, params.idOrName, fetch);
    return { backend, idOrName: params.idOrName, pokemon, errorKind: null };
  } catch (error) {
    console.error("Error fetching Pokémon:", error);
    return { backend, idOrName: params.idOrName, pokemon: null, errorKind: getFetchErrorKind(error) };
  }
};
