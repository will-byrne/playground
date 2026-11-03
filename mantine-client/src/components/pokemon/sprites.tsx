import { Box, Card, Image, SimpleGrid, Text, Title, UnstyledButton } from '@mantine/core';
import { TEXT, formatSpriteName } from '../../pokedex';
import classes from '../pokedex.module.css';

export function Sprites({
  spriteList,
  selectedKey,
  onSelect,
}: {
  spriteList: Record<string, string>;
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <Box mt="1.5rem">
      <Title order={2} fz="1.875rem" mb="1rem">
        {TEXT.sprites}
      </Title>
      <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 6 }} spacing="1rem">
        {Object.entries(spriteList).map(([name, url]) => {
          const selected = name === selectedKey;
          return (
            <UnstyledButton key={name} onClick={() => onSelect(name)} aria-pressed={selected} h="100%">
              <Card
                className={`${classes.card} ${classes.spriteCard} ${selected ? classes.spriteCardSelected : ''}`}
                padding="1rem"
                h="100%"
              >
                <Image alt={name} src={url} w="4rem" h="4rem" fit="contain" mx="auto" />
                <Text
                  size="xs"
                  ta="center"
                  mt="0.5rem"
                  c={selected ? 'lavender.6' : 'dark.2'}
                  fw={selected ? 600 : undefined}
                >
                  {selected ? TEXT.selected : formatSpriteName(name)}
                </Text>
              </Card>
            </UnstyledButton>
          );
        })}
      </SimpleGrid>
    </Box>
  );
}
