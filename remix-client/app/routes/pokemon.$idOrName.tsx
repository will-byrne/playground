import { useLoaderData } from "@remix-run/react";
import { PokemonSprites } from "pokenode-ts";
import { useState, type FunctionComponent } from "react";
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

const getSprites = (sp: PokemonSprites, k?: string): Record<string, string> => {
  return Object.entries(sp).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (typeof value === "string") {
        const newKey = `${k ? `${k}-` : ""}${key}`;
        acc[newKey] = value;
      } else if (value && typeof value === "object") {
        Object.assign(acc, getSprites(value, key));
      }
      return acc;
    },
    {}
  );
};

export const loader = async ({ params }) => {
  const pokemon = await typedFetch<PokeboxEntry>(
    `http://localhost:3000/pokemon/${params.idOrName}`
  );

  return { pokemon };
};

export default function Pokemon() {
  const { pokemon } = useLoaderData<typeof loader>();
  const [showShiny, setShowShiny] = useState(false);
  const spriteList = getSprites(pokemon.sprites);
  const officialArtFront =
    spriteList["showdown-front-default"] ??
    spriteList["official-artwork-front"];
  const officialArtShiny =
    spriteList["showdown-front-shiny"] ??
    spriteList["official-artwork-front_shiny"];

  return (
    <div className="hero bg-base-200 min-h-screen min-w-screen">
      <div className="hero-content flex-col lg:flex-row">
        <div>
          {officialArtShiny && (
            <input
              onChange={() => setShowShiny(!showShiny)}
              type="checkbox"
              defaultChecked={false}
              className="toggle"
            />
          )}
          <img
            alt="official art"
            src={showShiny ? officialArtShiny : officialArtFront}
            className="max-w-sm rounded-lg shadow-2xl h-96"
          />
        </div>
        <div>
          <h1 className="text-5xl font-bold">{`${pokemon.id}: ${pokemon.name}`}</h1>
          <div>
            {pokemon.types.map((type) => (
              <div key={type} className="badge badge-secondary mr-1">
                {type}
              </div>
            ))}
          </div>
          <p className="py-6">
            {pokemon.species_description.replace(/\r?\n/g, " ")}
          </p>
          abilities go here!
          <div className="carousel rounded-box">
            <div className="carousel-item">
              {Object.entries(spriteList).map(([name, url]) => (
                <img alt={name} className="h36" key={url} src={url} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
