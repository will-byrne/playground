import { MantineProvider } from '@mantine/core';
import './App.css'
import '@mantine/core/styles.css';
import { HomePage } from './components/home/homepage';
import type { PokemonSprites } from 'pokenode-ts';
import { useState } from 'react';
import { useListState } from '@mantine/hooks';
import { typedFetch } from './utils/typed-fetch';
import { PokemonPage } from './components/pokemon/pokemonpage';
import { hasInDex } from './utils/has-in-dex';

export type Ability = {
  name: string,
  flavour_text: string,
  effect: string,
}
export type PokeboxEntry = {
  id: number,
  name: string,
  species_description: string,
  types: string[],
  abilities: Ability[],
  sprites: PokemonSprites,
};

export type PokeDexEntry = {
  id: number,
  name: string,
};

function App() {
  const [currentPokemon, setCurrentPokemon] = useState<PokeboxEntry>();
  const [pokedex, pokedexHandler] = useListState<PokeDexEntry>([]);

  const loadSpecificPokemon = async (idOrName: string) => {
    const pokeboxEntry = await typedFetch<PokeboxEntry>(`http://localhost:3000/pokemon/${idOrName}`);
    setCurrentPokemon(pokeboxEntry);
    if (!hasInDex) {
      const { id, name } = pokeboxEntry;
      pokedexHandler.append({ id, name });
    }
  }
  return (
    <MantineProvider defaultColorScheme="dark">
      {!currentPokemon && <HomePage loadSpecificPokemon={loadSpecificPokemon} />}
      {currentPokemon && <PokemonPage back={() => setCurrentPokemon(undefined)} pokemon={currentPokemon} />}
    </MantineProvider>
  )
}

export default App
