import { useLoaderData } from "@remix-run/react";
import { PokemonSprites } from "pokenode-ts";
import type { FunctionComponent } from "react";
import { typedFetch } from "utils/typed-fetch";

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
  sprites: PokemonSprites;
};

export const loader = async ({ params }) => {
  const pokemon = await typedFetch<PokeboxEntry>(
    `http://localhost:3000/pokemon/${params.idOrName}`
  );

  return { pokemon };
};

export const Pokemon: FunctionComponent = () => {
  const { pokemon } = useLoaderData<typeof loader>();
  return <div>{JSON.stringify(pokemon, null, 3)}</div>;
};
