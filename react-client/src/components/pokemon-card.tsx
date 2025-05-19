import type { PokemonDeets } from "./hero.tsx";
import { Abilities } from "./ablities.tsx";
import { getEnglishEntry } from "../utils/get-english-entry.ts";
import type { PokemonSprites } from "pokenode-ts";

const getSprites = (sp: PokemonSprites, k?: string): Record<string, string> => {
  return Object.entries(sp).reduce((prev, current) => {
    if (typeof current[1] === 'string') {
      const toReturn: Record<string, string> = { ...prev };
      const newKey = `${k ? `${k}-` : ''}${current[0]}`;
      toReturn[newKey] = (current[1] as string);
      console.log('was a string')
      return toReturn;
    }
    else if (current[1] != null && typeof current[1] === 'object') {
      return { ...prev, ...getSprites(current[1], current[0]) };
    }
    return prev;
  }, {});
}

export const PokemonCard = ({
  pokemonDeets: {
    abilities,
    pokemon: { types, sprites },
    species: { flavor_text_entries, name },
  },
  setCurrentPokemon,
}: {
  pokemonDeets: PokemonDeets;
  setCurrentPokemon: (pokemonDeets: PokemonDeets | undefined) => void;
}) => {


  const spriteList = getSprites(sprites);

  console.log(JSON.stringify(spriteList, null, 4))

  return (
    <>
      <div className="hero bg-base-200 min-h-screen min-w-screen">
        <div className="hero-content flex-col">
          <div className="carousel rounded-box w-full">
            <div className="carousel-item">
              {Object.entries(spriteList)
                .map(([, url], i) => (
                  <img key={i} src={url} />
                ))}
            </div>
          </div>
          <div>
            <h1 className="text-5xl font-bold">{name}</h1>
            <p className="py-6">
              {getEnglishEntry(flavor_text_entries)?.flavor_text.replace(
                /\r?\n/g,
                " ",
              )}
            </p>
            <div>
              {types.map(({ type }, i) => (
                <div key={i} className="badge badge-secondary mr-1">
                  {type.name}
                </div>
              ))}
            </div>
            <Abilities abilities={abilities} />
            <button
              onClick={() => setCurrentPokemon(undefined)}
              className="btn btn-primary mt-2 block"
            >
              Go Back!
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
