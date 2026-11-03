import './pokedex.css'
import { useEffect, useState } from 'react'
import { HomePage } from './components/home-page.tsrx'
import { PokemonPage } from './components/pokemon-page.tsrx'
import { getBackendFromSearch, parseRoute } from './pokedex.ts'

const readLocation = () => ({
  route: parseRoute(window.location.pathname),
  backend: getBackendFromSearch(window.location.search),
})

function App() {
  const [{ route, backend }, setLocation] = useState(readLocation)

  useEffect(() => {
    const onPopState = () => setLocation(readLocation())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return route.page === 'pokemon' ? (
    <PokemonPage key={`${backend}-${route.idOrName}`} idOrName={route.idOrName} backend={backend} />
  ) : (
    <HomePage key={backend} backend={backend} />
  )
}

export default App
