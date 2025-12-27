import type { PokeboxEntry } from "./hero.tsx";
import { Abilities } from "./ablities.tsx";
import type { PokemonSprites } from "pokenode-ts";
import { useState } from "react";

const getSprites = (sp: PokemonSprites, k?: string): Record<string, string> => {
  return Object.entries(sp).reduce((prev, current) => {
    if (typeof current[1] === 'string') {
      const toReturn: Record<string, string> = { ...prev };
      const newKey = `${k ? `${k}-` : ''}${current[0]}`;
      toReturn[newKey] = (current[1] as string);

      return toReturn;
    }
    else if (current[1] != null && typeof current[1] === 'object') {
      return { ...prev, ...getSprites(current[1], current[0]) };
    }
    return prev;
  }, {});
}

export const PokemonCard = ({
  pokeboxEntry: { id, name, species_description, types, abilities, sprites },
  setCurrentPokemon,
}: {
  pokeboxEntry: PokeboxEntry;
  setCurrentPokemon: (pokemonDeets: PokeboxEntry | undefined) => void;
}) => {
  const [showShiny, setShowShiny] = useState(false);
  const spriteList = getSprites(sprites);
  const officialArtFront = spriteList['showdown-front_default'] ?? spriteList['official-artwork-front_default'];
  const officialShinyArtFront = spriteList['showdown-front_shiny'] ?? spriteList['official-artwork-front_shiny'];
  
  return (
    <>
      <div className="hero bg-base-200 min-h-screen min-w-screen">
        <div className="hero-content flex-col lg:flex-row">
          <div>
            { officialShinyArtFront && <input onChange={() => setShowShiny(!showShiny) } type="checkbox" defaultChecked={false} className="toggle" /> }
            <img
              src={showShiny ? officialShinyArtFront : officialArtFront}
              className="max-w-sm rounded-lg shadow-2xl h-96"
            />
          </div>
          <div>
            <h1 className="text-5xl font-bold">{`${id}: ${name}`}</h1>
            <div>
              {types.map((type , i) => (
                <div key={i} className="badge badge-secondary mr-1">
                  {type}
                </div>
              ))}
            </div>
            <p className="py-6">
              {species_description.replace(
                /\r?\n/g,
                " ",
              )}
            </p>
            <Abilities abilities={abilities} />
            <div className="carousel rounded-box">
              <div className="carousel-item">
                {Object.entries(spriteList)
                  .map(([, url], i) => (
                    <img className="h-36" key={i} src={url} />
                  ))}
              </div>
            </div>
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
