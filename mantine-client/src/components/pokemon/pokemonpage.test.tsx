import { fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PokemonPage } from './pokemonpage';
import { render } from '../../utils/test-renderer';
import { mockPokemon, mockPokemonWithForms } from '../../utils/mock-objects';

describe('PokemonPage forms', () => {
  it('hides the forms for a species with one form', () => {
    render(<PokemonPage pokemon={mockPokemon} backend="elysia" />);

    expect(screen.queryByRole('heading', { name: 'Forms' })).not.toBeInTheDocument();
  });

  it('starts on the Pokémon that was looked up', () => {
    render(<PokemonPage pokemon={mockPokemonWithForms} backend="elysia" />);

    expect(screen.getByRole('button', { name: 'Default Form' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Galarian Form' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('fire')).toBeInTheDocument();
  });

  it("shows the selected form's types, abilities and sprites", () => {
    render(<PokemonPage pokemon={mockPokemonWithForms} backend="elysia" />);

    fireEvent.click(screen.getByRole('button', { name: 'Galarian Form' }));

    expect(screen.getByRole('button', { name: 'Galarian Form' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('psychic')).toBeInTheDocument();
    expect(screen.queryByText('fire')).not.toBeInTheDocument();
    expect(screen.getByText('pastel-veil')).toBeInTheDocument();
    expect(screen.queryByText('run-away')).not.toBeInTheDocument();
    expect(screen.getByAltText('ponyta-galar sprite')).toHaveAttribute(
      'src',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10162.png',
    );
    // The heading stays the Pokémon that was looked up.
    expect(screen.getByRole('heading', { level: 1, name: 'ponyta' })).toBeInTheDocument();
  });
});
