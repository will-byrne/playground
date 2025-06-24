import { Group, Badge } from "@mantine/core";

export function Types({types}: {types: string[]})  {
  return (
     <Group justify='center'>
      {types.map((type, i) => (<Badge key={`type-${i}`}>{type}</Badge>))}
    </Group>
  );
}