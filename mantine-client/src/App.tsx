import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import { useEffect, useState } from 'react';
import { HomePage } from './components/home/homepage';
import { PokemonRoute } from './components/pokemon/pokemon-route';
import { getBackendFromSearch, parseRoute } from './pokedex';
import { theme } from './theme';

const readLocation = () => ({
  route: parseRoute(window.location.pathname),
  backend: getBackendFromSearch(window.location.search),
});

function App() {
  const [{ route, backend }, setLocation] = useState(readLocation);

  useEffect(() => {
    const onPopState = () => setLocation(readLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return (
    <MantineProvider theme={theme} forceColorScheme="dark">
      {route.page === 'pokemon' ? (
        <PokemonRoute key={`${backend}-${route.idOrName}`} idOrName={route.idOrName} backend={backend} />
      ) : (
        <HomePage key={backend} backend={backend} />
      )}
    </MantineProvider>
  );
}

export default App;
