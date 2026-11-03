import { Badge, Group } from '@mantine/core';
import { getTypeColor } from '../../pokedex';

export function Types({ types }: { types: string[] }) {
  return (
    <Group justify="center" gap="0.5rem" mt="1rem">
      {types.map((type) => {
        const { background, color } = getTypeColor(type);
        return (
          <Badge key={type} size="lg" radius="sm" color={background} c={color} tt="capitalize">
            {type}
          </Badge>
        );
      })}
    </Group>
  );
}
