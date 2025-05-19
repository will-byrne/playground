import './App.css'
import { Hero, type PokemonDeets } from './components/hero';
import { useState } from 'react';
import { PokemonCard } from './components/pokemon-card.tsx';

function App() {
  const [currentPokemon, setCurrentPokemon] = useState<PokemonDeets>();
  return (
    <>
      {!currentPokemon && <Hero setCurrentPokemon={setCurrentPokemon}/>}
      {currentPokemon && <PokemonCard pokemonDeets={currentPokemon} setCurrentPokemon={setCurrentPokemon}/>}
    </>
  )
}

export default App
