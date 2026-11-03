import { Box, Button, Container, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { type Backend, type PokeboxEntry, TEXT, fetchPokemon, homePath, navigate } from '../../pokedex';
import classes from '../pokedex.module.css';
import { PokemonPage } from './pokemonpage';

type State = { status: 'loading' } | { status: 'loaded'; pokemon: PokeboxEntry } | { status: 'not-found' };

export function PokemonRoute({ idOrName, backend }: { idOrName: string; backend: Backend }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    fetchPokemon(backend, idOrName)
      .then((pokemon) => setState({ status: 'loaded', pokemon }))
      .catch((err) => {
        console.error('Error fetching Pokémon:', err);
        setState({ status: 'not-found' });
      });
  }, [backend, idOrName]);

  if (state.status === 'loaded') {
    return <PokemonPage pokemon={state.pokemon} backend={backend} />;
  }

  return (
    <Box className={classes.page}>
      <Container size="72rem" p="1rem">
        {state.status === 'loading' ? (
          <Text ta="center" c="dark.1" py="4rem">
            {TEXT.loading}
          </Text>
        ) : (
          <Stack align="center" gap={0}>
            <Title order={1} fz="2.25rem" mb="1rem">
              {TEXT.notFoundTitle}
            </Title>
            <Text fz="xl" c="dark.1" mb="1.5rem">
              {TEXT.notFound(idOrName)}
            </Text>
            <Button c="dark.7" onClick={() => navigate(homePath(backend))}>
              {TEXT.backToList}
            </Button>
          </Stack>
        )}
      </Container>
    </Box>
  );
}
