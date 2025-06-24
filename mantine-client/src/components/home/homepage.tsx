import { Button, Container, NumberInput, Text, Title } from '@mantine/core';
import { Dots } from '../../dots';
import classes from './homepage.module.css';
import { useState } from 'react';

export function HomePage({ loadSpecificPokemon }: { loadSpecificPokemon: (id: number) => void}) {
  const [selectedId, setSelectedId] = useState<string | number>(1);
  return (
    <Container className={classes.wrapper} size={1400}>
      <Dots className={classes.dots} style={{ left: 0, top: 0 }} />
      <Dots className={classes.dots} style={{ left: 60, top: 0 }} />
      <Dots className={classes.dots} style={{ left: 0, top: 140 }} />
      <Dots className={classes.dots} style={{ right: 0, top: 60 }} />

      <div className={classes.inner}>
        <Title className={classes.title}>
          Load a Pokémon by its{' '}
          <Text component="span" className={classes.highlight} inherit>
            Pokédex ID,
          </Text>{' '}
          or load a random Pokémon that is not in the cache.
        </Title>

        <Container p={0} size={600}>
          <Text size="lg" c="dimmed" className={classes.description}>
            A simple client for my coding playground.
          </Text>
        </Container>

        <div className={classes.controls}>
          <NumberInput label="Pokémon ID" min={1} max={1025} size="md" value={selectedId} onChange={setSelectedId} clampBehavior='strict'/>
          <Button className={classes.control} size="md" variant="default" color="gray" onClick={() => loadSpecificPokemon(+selectedId)} >
            Load
          </Button>
        </div>
      </div>
    </Container>
  );
}