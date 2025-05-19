import type { Ability, Pokemon, PokemonSpecies, Move } from 'pokenode-ts';
import { typedFetch } from '../utils/typed-fetch.ts';
import { useState } from 'react';

export type PokemonDeets = {pokemon: Pokemon, species: PokemonSpecies, abilities: Ability[], moves: Move[]};

export const Hero = ({ setCurrentPokemon }: { setCurrentPokemon: (pokemonDeets: PokemonDeets | undefined) => void}) => {
  const [idValue, setIdValue] = useState<number>(1);
  const onClick = async () => {
    const pokemonDeets = await typedFetch<PokemonDeets>(`http://localhost:3000/pokemon/${idValue}`);
    setCurrentPokemon(pokemonDeets);
  }

  return (
    <>
      <div className="hero bg-base-200 min-h-screen min-w-screen">
        <div className="hero-content flex-col lg:flex-row-reverse">
          <div className="text-center lg:text-left">
            <h1 className="text-5xl font-bold">Find a Pokemon</h1>
            <p className="py-6">
              Provident cupiditate voluptatem et in. Quaerat fugiat ut assumenda excepturi exercitationem
              quasi. In deleniti eaque aut repudiandae et a id nisi.
            </p>
          </div>
          <div className="card bg-base-100 w-full max-w-sm shrink-0 shadow-2xl">
            <div className="card-body">
              <fieldset className="fieldset">
                <label className="label">Pokedex no.</label>
                <input type="number" min={1} max={1025} className="input" placeholder="001" value={idValue} onChange={(e) => setIdValue(Number(e.currentTarget.value))}/>
                <button onClick={onClick} className="btn btn-neutral mt-4">Search</button>
              </fieldset>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
