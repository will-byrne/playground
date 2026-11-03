import type { PageServerLoad } from "./$types";
import { fetchPokemon, getBackendFromSearch } from "$lib/pokedex";

export const load: PageServerLoad = async ({ params, fetch, url }) => {
  const backend = getBackendFromSearch(url.search);
  try {
    return { backend, idOrName: params.idOrName, pokemon: await fetchPokemon(backend, params.idOrName, fetch) };
  } catch (error) {
    console.error("Error fetching Pokémon:", error);
    return { backend, idOrName: params.idOrName, pokemon: null };
  }
};
