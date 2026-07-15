import { useEffect,useState } from 'react';
import { Hero, type PokeboxEntry } from './hero.tsrx';
import { PokemonCard } from './pokemon-card.tsrx';
import { typedFetch } from '../utils/typed-fetch';
import { usePokedexCache, type PokedexEntry } from '../hooks/usePokedexCache';

export const Home = () => @{
  const [currentPokemon, setCurrentPokemon] = useState<PokeboxEntry>();
  const [error, setError] = useState<string>();
  const [isCacheOpen, setIsCacheOpen] = useState(false);
  const { dex: cachedDex, addToDex, hasInDex } = usePokedexCache();

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
      setIsCacheOpen(false);
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

  <>
    <div className="app-shell">
      <div className="app-header">
        <h1 className="hero-title">Pokémon Viewer</h1>
      </div>
      <div className="toolbar">
        <div className="toolbar__actions">
          <button
            type="button"
            className="primary-button"
            onClick={loadRandomPokemon}
          >
            Load Random
          </button>
          @if (cachedDex && cachedDex.length > 0) {
            <div className="cache-menu">
              <button
                tabIndex={0}
                type="button"
                className="secondary-button"
                onClick={() => setIsCacheOpen((open) => !open)}
              >
                Cached Pokémon
              </button>
              @if (isCacheOpen) {
                <ul className="cache-list">
                  @for (const { name, id } of cachedDex) {
                    <li key={`${id}-${name}`}>
                      <button
                        type="button"
                        className="cache-link"
                        onClick={() => loadSpecificPokemon(id.toString())}
                      >
                        {name}
                      </button>
                    </li>
                  }
                </ul>
              }
            </div>
          }
        </div>
      </div>
    </div>
    @if (error) {
      <div className="status-banner">
        <span>{error}</span>
      </div>
    }

    @if (currentPokemon) {
      <PokemonCard pokeboxEntry={currentPokemon} setCurrentPokemon={setCurrentPokemon} />;
    } @else {
      <Hero loadSpecificPokemon={loadSpecificPokemon} />
    }
    </>
}