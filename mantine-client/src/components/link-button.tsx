import { Button, type ButtonProps } from '@mantine/core';
import type { ReactNode } from 'react';
import { navigate } from '../pokedex';

/** A Mantine button rendered as an anchor that navigates via the shared pushState router. */
export function LinkButton({ to, children, ...props }: ButtonProps & { to: string; children: ReactNode }) {
  return (
    <Button
      component="a"
      href={to}
      onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        navigate(to);
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
