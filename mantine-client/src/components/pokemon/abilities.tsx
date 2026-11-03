import { Box, Card, SimpleGrid, Text, Title } from '@mantine/core';
import { type Ability, TEXT } from '../../pokedex';
import classes from '../pokedex.module.css';

export function Abilities({ abilities }: { abilities: Ability[] }) {
  return (
    <Box mt="1.5rem">
      <Title order={2} fz="1.875rem" mb="1rem">
        {TEXT.abilities}
      </Title>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="1rem">
        {abilities.map(({ name, flavour_text, effect }) => (
          <Card key={name} className={classes.cardLg} padding="1.5rem">
            <Title order={3} fz="1.25rem" fw={600} c="lavender.6" tt="capitalize" mb="0.5rem">
              {name}
            </Title>
            <Text fs="italic" c="dark.0" opacity={0.7} mb="0.5rem">
              {flavour_text}
            </Text>
            <Text size="sm" c="dark.0" opacity={0.6}>
              {effect}
            </Text>
          </Card>
        ))}
      </SimpleGrid>
    </Box>
  );
}
