import './App.css'
import { Hero, type PokemonDeets } from './components/hero';
import { useMemo, useState } from 'react';
import { PokemonCard } from './components/pokemon-card.tsx';
import { typedFetch } from './utils/typed-fetch.ts';

type PokedexEntry = { id: number, name: string };

function App() {
  const [currentPokemon, setCurrentPokemon] = useState<PokemonDeets>();
  const [cachedDex, setCachedDex] = useState<PokedexEntry[]>();

  useMemo(async () => {
    setCachedDex(await typedFetch<PokedexEntry[]>('http://localhost:3000/pokedex'));
  }, [])

  const loadSpecificPokemon = async (id: number) => {
    const pokemonDeets = await typedFetch<PokemonDeets>(`http://localhost:3000/pokemon/${id}`);
    setCurrentPokemon(pokemonDeets);
    setCachedDex(await typedFetch<PokedexEntry[]>('http://localhost:3000/pokedex'));
  }

  const loadRandomPokemon = async () => {
    const pokemonDeets = await typedFetch<PokemonDeets>('http://localhost:3000/pokemon/random-new');
    setCurrentPokemon(pokemonDeets);
    setCachedDex(await typedFetch<PokedexEntry[]>('http://localhost:3000/pokedex'));
  };

  return (
    <>
      <div className="sticky top-0 navbar bg-base-300">
        <div className="ps-4">
          <a onClick={() => setCurrentPokemon(undefined)} className="text-lg font-bold cursor-pointer">Pokemon Viewer</a>
        </div>
        <div className="flex grow justify-end px-2">
          <div className="flex items-stretch">
            <a className="btn btn-ghost rounded-field" onClick={loadRandomPokemon}>Load Random</a>
            {(cachedDex && cachedDex.length) &&
              <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="btn btn-ghost rounded-field">Cached Pokemon</div>
                <ul
                  tabIndex={0}
                  className="menu dropdown-content bg-base-200 rounded-box z-1 mt-4 w-52 p-2 shadow-sm">
                    { cachedDex.map(({ name, id}, i) => (
                      <li key={`cached-${i}`}><a onClick={() => loadSpecificPokemon(id)}>{name}</a></li>
                    ))}
                </ul>
              </div>
            }
          </div>
        </div>
      </div>
      {!currentPokemon && <Hero loadSpecificPokemon={loadSpecificPokemon}/>}
      {currentPokemon && <PokemonCard pokemonDeets={currentPokemon} setCurrentPokemon={setCurrentPokemon}/>}
    </>
  )
}

export default App
