import { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';

import { PokemonPage } from './pokemonpage';
import { mockPokemon } from '../../utils/mock-objects';

const meta: Meta<typeof PokemonPage> = {
  title: 'Pokemon/Pokemon Page',
  component: PokemonPage,
};

export default meta;
type Story = StoryObj<typeof PokemonPage>;

export const HappyPath: Story = {
  args: {
    pokemon: mockPokemon,
    back: () => {},
  },
  play: async ({ canvasElement, args }) => {
    const back = jest.fn();
    args.back = back;
    const canvas = within(canvasElement);
    await canvas.findByText('Back');

    await userEvent.click(canvas.getByText('Back'));
    expect(back).toHaveBeenCalled();
  },
};