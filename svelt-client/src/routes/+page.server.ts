import type { PageServerLoad } from "./$types";
import { typedFetch } from "$lib/typed-fetch";

type PokedexEntry = {
  id: number;
  name: string;
};

export const load: PageServerLoad = async ({ fetch }) => {
  const unsortedDex = await typedFetch<PokedexEntry[]>("http://localhost:3000/pokedex", fetch);
  const sortedDex = unsortedDex.sort((a, b) => a.id - b.id);

  return {
    pokedex: sortedDex,
  };
};
