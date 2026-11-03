import type { PageServerLoad } from "./$types";
import { TEXT, fetchPokedex, getBackendFromSearch } from "$lib/pokedex";

export const load: PageServerLoad = async ({ fetch, url }) => {
  const backend = getBackendFromSearch(url.search);
  try {
    return { backend, pokedex: await fetchPokedex(backend, fetch), error: null };
  } catch (error) {
    console.error("Failed to load the Pokédex:", error);
    return { backend, pokedex: [], error: TEXT.pokedexError(backend) };
  }
};
