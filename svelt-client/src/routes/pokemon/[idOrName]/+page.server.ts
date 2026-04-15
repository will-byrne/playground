import type { PageServerLoad } from "./$types";
import { typedFetch } from "$lib/typed-fetch";

type PokeboxEntry = {
  id: number;
  name: string;
  species_description: string;
  types: string[];
  abilities: {
    name: string;
    flavour_text: string;
    effect: string;
  }[];
  sprites: Record<string, unknown>;
};

export const load: PageServerLoad = async ({ params, fetch }) => {
  try {
    const pokemon = await typedFetch<PokeboxEntry>(
      `http://localhost:3000/pokemon/${params.idOrName}`,
      fetch
    );

    return { pokemon };
  } catch (error) {
    console.error("Error fetching Pokemon:", error);
    return { pokemon: null };
  }
};
