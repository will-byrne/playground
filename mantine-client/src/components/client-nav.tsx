import { Button, Group, Text } from '@mantine/core';
import { CLIENT } from '../client';
import { TEXT, getClientLinks } from '../pokedex';

/** Links to the same page in every other client. */
export function ClientNav({ path }: { path: string }) {
  return (
    <Group
      component="nav"
      aria-label="Clients"
      justify="center"
      gap="0.5rem"
      px="1rem"
      py="0.75rem"
      bg="dark.8"
      style={{ borderBottom: '1px solid rgba(202, 211, 245, 0.1)' }}
    >
      <Text span fz="sm" fw={600} c="dark.2" mr="0.25rem">
        {TEXT.clientNavLabel}
      </Text>
      {getClientLinks(CLIENT, path).map((link) => (
        <Button
          key={link.client}
          component="a"
          href={link.href}
          aria-current={link.current ? 'page' : undefined}
          size="xs"
          {...(link.current ? { c: 'dark.7' } : { variant: 'outline', color: 'dark.0' })}
        >
          {link.label}
        </Button>
      ))}
    </Group>
  );
}
