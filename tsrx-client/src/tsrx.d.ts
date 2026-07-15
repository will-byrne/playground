declare module '*.tsrx' {
  import type { ComponentType } from 'react';

  const component: ComponentType<any>;

  export const Home: ComponentType<any>;
  export const Hero: ComponentType<any>;
  export const PokemonCard: ComponentType<any>;
  export const Abilities: ComponentType<any>;
  export type PokeboxEntry = any;

  export default component;
}
