import { MantineProvider } from '@mantine/core';
import './App.css'
import '@mantine/core/styles.css';
import { HomePage } from './components/home/homepage';
import type { PokemonSprites } from 'pokenode-ts';
import { useState } from 'react';
import { useListState } from '@mantine/hooks';
import { typedFetch } from './utils/typed-fetch';
import { PokemonPage } from './components/pokemon/pokemonpage';

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

type PokeDexEntry = {
  id: number,
  name: string,
};

function App() {
  const [currentPokemon, setCurrentPokemon] = useState<PokeboxEntry>();
  const [pokedex, pokedexHandler] = useListState<PokeDexEntry>([]);

  const loadSpecificPokemon = async (dexNo: number) => {
    const pokeboxEntry = await typedFetch<PokeboxEntry>(`http://localhost:3000/pokemon/${dexNo}`);
    setCurrentPokemon(pokeboxEntry);
    if (!pokedex.find(({ id }) => id === dexNo)) {
      const { id, name } = pokeboxEntry;
      pokedexHandler.append({ id, name });
    }
  }
  return (
    <MantineProvider defaultColorScheme="dark">
      { !currentPokemon && <HomePage loadSpecificPokemon={loadSpecificPokemon}/> }
      { currentPokemon && <PokemonPage back={() => setCurrentPokemon(undefined)} pokemon={currentPokemon}/> }
    </MantineProvider>
  )
}

export default App
