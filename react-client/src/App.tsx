import "./App.css";
import { useEffect, useState } from "react";
import { Hero, type PokeboxEntry } from "./components/hero";
import { PokemonCard } from "./components/pokemon-card.tsx";
import { typedFetch } from "./utils/typed-fetch.ts";
import { usePokedexCache, type PokedexEntry } from "./hooks/usePokedexCache.ts";

function App() {
  const [currentPokemon, setCurrentPokemon] = useState<PokeboxEntry>();
  const { dex: cachedDex, addToDex, hasInDex } = usePokedexCache();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const loadDex = async () => {
      const unsortedDex = await typedFetch<PokedexEntry[]>(
        "http://localhost:3000/pokedex"
      );

      unsortedDex.forEach(addToDex);
    };

    loadDex();
  }, [addToDex]);

  const loadSpecificPokemon = async (idOrName: string) => {
    try {
      const pokeboxEntry = await typedFetch<PokeboxEntry>(
        `http://localhost:3000/pokemon/${idOrName}`
      );
      setCurrentPokemon(pokeboxEntry);
      setError(undefined);
      if (!hasInDex(idOrName)) {
        const { id, name } = pokeboxEntry;
        addToDex({ id, name });
      }
    } catch (error: any) {
      if (error.status === 404) {
        setError("Pokemon not found");
      } else if (error.status === 500) {
        setError("Server error");
      } else {
        setError("An error occurred");
      }
    }
  };

  const loadRandomPokemon = async () => {
    try {
      const pokeboxEntry = await typedFetch<PokeboxEntry>(
        "http://localhost:3000/pokemon/random-new"
      );
      setCurrentPokemon(pokeboxEntry);
      setError(undefined);
      const { id, name } = pokeboxEntry;
      addToDex({ id, name });
    } catch (error: any) {
      if (error.status === 404) {
        setError("Pokemon not found");
      } else if (error.status === 500) {
        setError("Server error");
      } else {
        setError("An error occurred");
      }
    }
  };

  return (
    <>
      <div className="sticky top-0 navbar bg-base-300 z-50">
        <div className="ps-4">
          <button
            type="button"
            onClick={() => setCurrentPokemon(undefined)}
            className="btn btn-ghost rounded-field text-lg font-bold cursor-pointer nav title"
          >
            Pokemon Viewer
          </button>
        </div>
        <div className="flex grow justify-end px-2">
          <div className="flex items-stretch">
            <button
              type="button"
              className="btn btn-ghost rounded-field nav"
              onClick={loadRandomPokemon}
            >
              Load Random
            </button>
            {cachedDex && cachedDex.length > 0 && (
              <div className="dropdown dropdown-end">
                <button
                  tabIndex={0}
                  type="button"
                  className="btn btn-secondary btn-ghost rounded-field nav text"
                >
                  Cached Pokemon
                </button>
                <ul className="menu dropdown-content bg-base-200 rounded-box z-1 mt-4 w-52 p-2 shadow-sm">
                  {cachedDex.map(({ name, id }) => (
                    <li key={`${id}-${name}`}>
                      <button
                        type="button"
                        onClick={() => loadSpecificPokemon(id.toString())}
                      >
                        {name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}
      {!currentPokemon && <Hero loadSpecificPokemon={loadSpecificPokemon} />}
      {currentPokemon && (
        <PokemonCard
          pokeboxEntry={currentPokemon}
          setCurrentPokemon={setCurrentPokemon}
        />
      )}
    </>
  );
}

export default App;
