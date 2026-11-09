import { Meta, StoryObj } from '@storybook/react';

import { PokemonPage } from './pokemonpage';
import { mockPokemon, mockPokemonWithForms } from '../../utils/mock-objects';

const meta: Meta<typeof PokemonPage> = {
  title: 'Pokemon/Pokemon Page',
  component: PokemonPage,
};

export default meta;
type Story = StoryObj<typeof PokemonPage>;

export const HappyPath: Story = {
  args: {
    pokemon: mockPokemon,
    backend: 'elysia',
  },
};

export const WithForms: Story = {
  args: {
    pokemon: mockPokemonWithForms,
    backend: 'elysia',
  },
};
