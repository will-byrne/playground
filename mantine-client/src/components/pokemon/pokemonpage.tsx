import { Button, Center, Container, Image, Switch, Text, Title } from '@mantine/core';
import classes from '../home/homepage.module.css';
import type { PokeboxEntry } from '../../App';
import type { PokemonSprites } from 'pokenode-ts';
import { useState } from 'react';
import { Types } from './types';
import { Abilities } from './abilities';
import { SpriteEntry, Sprites } from './sprites';

const getSprites = (sp: PokemonSprites, k?: string): SpriteEntry[] => {
  return Object.entries(sp).reduce((prev, current) => {
    if (typeof current[1] === 'string') {
      const newKey = `${k ? `${k}-` : ''}${current[0]}`;
      return [ ...prev, { name: newKey, url: current[1] }];
    }
    else if (current[1] != null && typeof current[1] === 'object') {
      return [ ...prev, ...getSprites(current[1], current[0]) ];
    }
    return prev;
  }, [] as SpriteEntry[]);
}

export function PokemonPage({ pokemon, back }: { pokemon: PokeboxEntry, back: () => void}) {
  const spriteList = getSprites(pokemon.sprites);
  const officialArtFront = spriteList.find(({ name }) => name === 'showdown-front_default') ?? spriteList.find(({ name }) => name === 'official-artwork-front_default');
  const officialShinyArtFront = spriteList.find(({ name }) => name === 'showdown-front_shiny') ?? spriteList.find(({ name }) => name === 'official-artwork-front_shiny');
  const [showShiny, setShowShiny] = useState(!!officialShinyArtFront);

  return (
    <Container className={classes.wrapper} size={1400}>
      <div className={classes.inner}>
        <Title className={classes.title}>{`${pokemon.id}: ${pokemon.name}`}</Title>
        <Types types={pokemon.types}/>
        <Center>
          { officialShinyArtFront && <Switch checked={showShiny} size="lg" onLabel="Shiny" onChange={(event) => setShowShiny(event.currentTarget.checked)}/> }
          <Image h={240} w="auto" fit="contain" src={showShiny && officialShinyArtFront ? officialShinyArtFront.url : officialArtFront?.url} />
        </Center>
        <Container p={0} size={600}>
          <Text size="lg" c="dimmed" className={classes.description}>{pokemon.species_description}</Text>
        </Container>
        <Abilities abilities={pokemon.abilities} pokemonName={pokemon.name} />
        <Sprites spriteEntries={spriteList} />

        <div className={classes.controls}>
          <Button className={classes.control} size="md" variant="default" color="gray" onClick={() => back()}>
            Back
          </Button>
        </div>
      </div>
    </Container>
  );
}