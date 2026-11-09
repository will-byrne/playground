import { Box, Button, Card, Container, Group, Image, SimpleGrid, Stack, Switch, Text, Title } from '@mantine/core';
import { useState } from 'react';
import {
  type Backend,
  type PokeboxEntry,
  TEXT,
  canGoToNext,
  canGoToPrevious,
  formatDescription,
  formatDexNo,
  getDefaultSpriteKey,
  getDisplaySpriteKey,
  getForms,
  getShinySpriteKey,
  getSprites,
  homePath,
  navigate,
  pokemonPath,
} from '../../pokedex';
import classes from '../pokedex.module.css';
import { Abilities } from './abilities';
import { Sprites } from './sprites';
import { Types } from './types';

export function PokemonPage({ pokemon, backend }: { pokemon: PokeboxEntry; backend: Backend }) {
  const forms = getForms(pokemon);
  const [selectedFormId, setSelectedFormId] = useState(pokemon.id);
  const form = forms.find((f) => f.id === selectedFormId) ?? forms[0];

  const spriteList = getSprites(form.sprites);
  const [selectedSpriteKey, setSelectedSpriteKey] = useState(() => getDefaultSpriteKey(spriteList));
  const [showShiny, setShowShiny] = useState(false);
  const displaySpriteKey = getDisplaySpriteKey(spriteList, selectedSpriteKey, showShiny);
  const hasShiny = Boolean(getShinySpriteKey(spriteList, selectedSpriteKey));

  const selectForm = (formId: number) => {
    const next = forms.find((f) => f.id === formId);
    if (!next) return;
    setSelectedFormId(formId);
    // Each form has its own sprites, so start from its default one.
    setSelectedSpriteKey(getDefaultSpriteKey(getSprites(next.sprites)));
  };

  return (
    <Box className={classes.page}>
      <Container size="72rem" p="1rem">
        {/* Header */}
        <Box
          mb="1.5rem"
          ta="center"
          style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}
        >
          <Button color="dark.5" c="dark.0" onClick={() => navigate(homePath(backend))}>
            {TEXT.backToList}
          </Button>
          <Box style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {canGoToPrevious(pokemon.id) ? (
              <Button
                variant="outline"
                color="dark.0"
                aria-label="Previous Pokémon"
                onClick={() => navigate(pokemonPath(pokemon.id - 1, backend))}
              >
                {TEXT.previous}
              </Button>
            ) : (
              <div className={classes.spacer} />
            )}
            <div>
              <Title order={1} fz="2.25rem" tt="capitalize" mb="0.5rem">
                {pokemon.name}
              </Title>
              <Text fz="xl" c="dark.1">
                {formatDexNo(pokemon.id)}
              </Text>
            </div>
            {canGoToNext(pokemon.id) ? (
              <Button
                variant="outline"
                color="dark.0"
                aria-label="Next Pokémon"
                onClick={() => navigate(pokemonPath(pokemon.id + 1, backend))}
              >
                {TEXT.next}
              </Button>
            ) : (
              <div className={classes.spacer} />
            )}
          </Box>
        </Box>

        {forms.length > 1 && (
          <Stack align="center" gap="0.5rem" mb="1.5rem">
            <Title order={2} fz="1.125rem" fw={600} c="dark.1">
              {TEXT.forms}
            </Title>
            <Group justify="center" gap="0.5rem">
              {forms.map((f) => {
                const selected = f.id === form.id;
                return (
                  <Button
                    key={f.id}
                    size="xs"
                    variant={selected ? 'filled' : 'outline'}
                    color={selected ? undefined : 'dark.0'}
                    aria-pressed={selected}
                    onClick={() => selectForm(f.id)}
                  >
                    {f.label}
                  </Button>
                );
              })}
            </Group>
          </Stack>
        )}

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="1.5rem">
          {/* Pokémon Image Card */}
          <Card className={classes.card} padding="1.5rem">
            <Stack align="center" gap="0.5rem">
              <Image
                alt={`${form.name} sprite`}
                src={spriteList[displaySpriteKey]}
                h="16rem"
                w="auto"
                maw="100%"
                fit="contain"
              />
              {hasShiny && (
                <Switch
                  label={TEXT.shiny}
                  checked={showShiny}
                  onChange={(event) => setShowShiny(event.currentTarget.checked)}
                />
              )}
              <Types types={form.types} />
            </Stack>
          </Card>

          {/* Pokémon Details Card */}
          <Card className={classes.card} padding="1.5rem">
            <Title order={2} fz="1.5rem" fw={600} mb="1rem">
              {TEXT.description}
            </Title>
            <Text c="dark.0" opacity={0.8} lh={1.625}>
              {formatDescription(form.species_description)}
            </Text>
          </Card>
        </SimpleGrid>

        <Abilities abilities={form.abilities} />

        <Sprites spriteList={spriteList} selectedKey={selectedSpriteKey} onSelect={setSelectedSpriteKey} />
      </Container>
    </Box>
  );
}
