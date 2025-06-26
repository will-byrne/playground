import { Meta, StoryObj } from '@storybook/react';

import { Abilities } from './abilities';
import { mockPokemon } from '../../utils/mock-objects';

const meta: Meta<typeof Abilities> = {
  title: 'Pokemon/Abilities',
  component: Abilities,
};

export default meta;
type Story = StoryObj<typeof Abilities>;

export const HappyPath: Story = {
  args: {
    abilities: mockPokemon.abilities,
    pokemonName: mockPokemon.name,
  }
};