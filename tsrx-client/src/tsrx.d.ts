declare module '*.tsrx' {
  import type { ComponentType } from 'react';

  const component: ComponentType<any>;

  export const HomePage: ComponentType<any>;
  export const PokemonPage: ComponentType<any>;
  export const PokemonCard: ComponentType<any>;
  export const Abilities: ComponentType<any>;
  export const Link: ComponentType<any>;

  export default component;
}
