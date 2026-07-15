import type { PokemonSprites } from "pokenode-ts";
import { useState } from "react";

export type PokeboxEntry = {
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

export const Hero = ({
  loadSpecificPokemon,
}: {
  loadSpecificPokemon: (idOrName: string) => void;
}) => @{
  const [dexNo, setDexNo] = useState<string>("bulbasaur");

  <div className="hero-panel">
    <div className="hero-panel__content">
      <div className="hero-copy">
        <h1 className="hero-title">Find a Pokémon</h1>
        <p className="hero-copy__text">
          Load a Pokémon by its Pokédex ID, or discover a random one that is
          not yet in the cache.
        </p>
      </div>
      <div className="hero-search">
        <div className="hero-search__content">
          <fieldset className="search-fieldset">
            <label htmlFor="dexInput" className="search-label">
              Pokédex no.
            </label>
            <input
              id="dexInput"
              type="string"
              className="search-input"
              placeholder="sylveon"
              value={dexNo}
              onChange={(e) => setDexNo(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  loadSpecificPokemon(dexNo);
                }
              }}
            />
            <button
              type="button"
              onClick={() => loadSpecificPokemon(dexNo)}
              className="primary-button hero-search__button"
            >
              Search
            </button>
          </fieldset>
        </div>
      </div>
    </div>
  </div>
};