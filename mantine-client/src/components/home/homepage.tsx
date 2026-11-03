import {
  Alert,
  Box,
  Button,
  Card,
  Container,
  NativeSelect,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import {
  BACKEND_OPTIONS,
  type Backend,
  type PokedexEntry,
  TEXT,
  capitalize,
  fetchPokedex,
  fetchRandomNewPokemon,
  formatDexNo,
  getBackend,
  getFeaturedPokemon,
  getLeftToDiscover,
  getLeftToDiscoverDesc,
  homePath,
  navigate,
  pokemonPath,
  searchPokedex,
} from '../../pokedex';
import { LinkButton } from '../link-button';
import classes from '../pokedex.module.css';

export function HomePage({ backend }: { backend: Backend }) {
  const [pokedex, setPokedex] = useState<PokedexEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [idOrName, setIdOrName] = useState('');
  const [randomLoading, setRandomLoading] = useState(false);

  useEffect(() => {
    fetchPokedex(backend)
      .then(setPokedex)
      .catch((err) => {
        console.error('Failed to load the Pokédex:', err);
        setError(TEXT.pokedexError(backend));
      });
  }, [backend]);

  const searchResults = searchPokedex(pokedex, idOrName);

  const handleRandomNewPokemon = async () => {
    setRandomLoading(true);
    setError(null);
    try {
      const pokemon = await fetchRandomNewPokemon(backend);
      navigate(pokemonPath(pokemon.name, backend));
    } catch (err) {
      console.error('Failed to fetch a random new Pokémon:', err);
      setError(TEXT.randomError);
    } finally {
      setRandomLoading(false);
    }
  };

  return (
    <Box className={classes.page}>
      <Container size="56rem" py="2rem" px="1rem">
        {/* Header */}
        <Stack align="center" gap="1rem" mb="2rem">
          <Title order={1} fz="3rem" lh={1}>
            {TEXT.title}
          </Title>
          <Text fz="xl" c="dark.1">
            {TEXT.subtitle}
          </Text>
        </Stack>

        {error && (
          <Alert role="alert" color="red" variant="filled" mb="2rem" c="dark.6">
            {error}
          </Alert>
        )}

        {/* Search Section */}
        <Card className={classes.card} padding="1.5rem" mb="2rem">
          <Box
            mb="1rem"
            style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}
          >
            <Title order={2} fz="1.5rem" fw={600}>
              {TEXT.searchTitle}
            </Title>
            <NativeSelect
              label={TEXT.backendLabel}
              aria-label={TEXT.backendLabel}
              value={backend}
              data={BACKEND_OPTIONS}
              onChange={(event) => navigate(homePath(getBackend(event.currentTarget.value)))}
            />
          </Box>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (idOrName.trim()) navigate(pokemonPath(idOrName.trim(), backend));
            }}
          >
            <Text component="label" htmlFor="idOrNameInput" size="sm" display="block" py="0.5rem">
              {TEXT.searchLabel}
            </Text>
            <div className={classes.join}>
              <TextInput
                id="idOrNameInput"
                placeholder={TEXT.searchPlaceholder}
                value={idOrName}
                onChange={(e) => setIdOrName(e.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <Button type="submit" c={idOrName.trim() ? 'dark.7' : undefined} disabled={!idOrName.trim()}>
                {TEXT.search}
              </Button>
              <Button color="dark.5" c="dark.0" onClick={handleRandomNewPokemon} disabled={randomLoading}>
                {randomLoading ? TEXT.loading : TEXT.random}
              </Button>
            </div>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <Box mt="1rem">
              <Title order={3} fz="1.125rem" fw={600} mb="0.5rem">
                {TEXT.searchResults}
              </Title>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="0.5rem">
                {searchResults.map((pokemon) => (
                  <LinkButton
                    key={pokemon.id}
                    to={pokemonPath(pokemon.name, backend)}
                    variant="outline"
                    color="dark.0"
                    size="xs"
                    justify="flex-start"
                  >
                    <Text span ff="monospace" fz="inherit" mr="0.375rem">
                      {formatDexNo(pokemon.id)}
                    </Text>
                    <Text span tt="capitalize" fz="inherit">
                      {pokemon.name}
                    </Text>
                  </LinkButton>
                ))}
              </SimpleGrid>
            </Box>
          )}
        </Card>

        {/* Featured Pokémon */}
        <Box mb="2rem">
          <Title order={2} fz="1.875rem" mb="1.5rem">
            {TEXT.featured}
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="1rem">
            {getFeaturedPokemon(pokedex).map((pokemon) => (
              <Card key={pokemon.id} className={classes.cardLg} padding="1rem">
                <Stack align="center" gap="0.5rem">
                  <Title order={3} fz="1.125rem" fw={600}>
                    {formatDexNo(pokemon.id)}
                  </Title>
                  <Text fw={600} tt="capitalize" mb="0.5rem">
                    {pokemon.name}
                  </Text>
                  <LinkButton to={pokemonPath(pokemon.name, backend)} size="xs" c="dark.7">
                    {TEXT.viewDetails}
                  </LinkButton>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        </Box>

        {/* Quick Stats */}
        <Card className={classes.card} padding="1.5rem" mb="2rem">
          <Stack align="center" gap="1rem">
            <Title order={2} fz="1.5rem" fw={600}>
              {TEXT.statsTitle}
            </Title>
            <div className={classes.stats}>
              <div className={classes.stat}>
                <Text size="xs" c="dark.2">
                  {TEXT.statTotalTitle}
                </Text>
                <Text className={classes.statValue} c="lavender.6">
                  {pokedex.length}
                </Text>
                <Text size="xs" c="dark.2">
                  {TEXT.statTotalDesc}
                </Text>
              </div>
              <div className={classes.stat}>
                <Text size="xs" c="dark.2">
                  {TEXT.statLeftTitle}
                </Text>
                <Text className={classes.statValue} c="dark.5">
                  {getLeftToDiscover(pokedex)}
                </Text>
                <Text size="xs" c="dark.2">
                  {getLeftToDiscoverDesc(pokedex)}
                </Text>
              </div>
              <div className={classes.stat}>
                <Text size="xs" c="dark.2">
                  {TEXT.statLastUpdatedTitle}
                </Text>
                <Text className={classes.statValue} c="#f4dbd6">
                  {TEXT.statLastUpdatedValue}
                </Text>
                <Text size="xs" c="dark.2">
                  {TEXT.statLastUpdatedDesc}
                </Text>
              </div>
            </div>
          </Stack>
        </Card>

        {/* Browse Pokédex Pokémon */}
        <Card className={classes.card} padding="1.5rem">
          <Title order={2} fz="1.5rem" fw={600} mb="1rem">
            {TEXT.browseTitle}
          </Title>
          <Text component="label" htmlFor="dexSelector" size="sm" display="block" py="0.5rem">
            {TEXT.browseLabel}
          </Text>
          <NativeSelect
            id="dexSelector"
            size="lg"
            ml="1rem"
            maw="20rem"
            defaultValue=""
            onChange={(e) => {
              if (e.currentTarget.value) navigate(pokemonPath(e.currentTarget.value, backend));
            }}
            data={[
              { value: '', label: TEXT.browsePlaceholder, disabled: true },
              ...pokedex.map((pokemon) => ({
                value: pokemon.name,
                label: `${formatDexNo(pokemon.id)} - ${capitalize(pokemon.name)}`,
              })),
            ]}
          />
        </Card>
      </Container>
    </Box>
  );
}
