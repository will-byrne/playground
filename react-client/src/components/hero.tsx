import type { PokemonSprites } from 'pokenode-ts';
import { useState } from 'react';

export type PokeboxEntry = {
  id: number,
  name: string,
  species_description: string,
  types: string[],
  abilities: {
    name: string,
    flavour_text: string,
    effect: string,
  }[],
  sprites: PokemonSprites,
};

export const Hero = ({ loadSpecificPokemon }: { loadSpecificPokemon: (id: number) => void}) => {
  const [dexNo, setDexNo] = useState<number>(1);

  return (
    <>
      <div className="hero bg-base-200 min-h-screen min-w-screen">
        <div className="hero-content flex-col lg:flex-row-reverse">
          <div className="text-center lg:text-left">
            <h1 className="text-5xl font-bold">Find a Pokemon</h1>
            <p className="py-6">
              Load a Pokemon by its Pokedex ID, or load a random Pokemon that is not in the cache.
            </p>
          </div>
          <div className="card bg-base-100 w-full max-w-sm shrink-0 shadow-2xl">
            <div className="card-body">
              <fieldset className="fieldset">
                <label className="label">Pokedex no.</label>
                <input type="number" min={1} max={1025} className="input" placeholder="001" value={dexNo} onChange={(e) => setDexNo(Number(e.currentTarget.value))}/>
                <button onClick={() => loadSpecificPokemon(dexNo)} className="btn btn-neutral mt-4">Search</button>
              </fieldset>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
