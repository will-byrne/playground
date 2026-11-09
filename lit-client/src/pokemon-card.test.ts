import { fireEvent, screen } from '@testing-library/dom';
import '@testing-library/jest-dom';
import './pokemon-card.js';
import type { PokeboxEntry } from './pokedex.js';
import { sylveon, vulpix } from '../stories/mocks/pokemon.js';

const show = async (pokemon: PokeboxEntry) => {
  document.body.innerHTML = '';
  const card = document.createElement('pokemon-card') as HTMLElement & {
    pokemon: PokeboxEntry;
    updateComplete: Promise<boolean>;
  };
  card.pokemon = pokemon;
  document.body.appendChild(card);
  await card.updateComplete;
  return card;
};

describe('<pokemon-card> forms', () => {
  it('hides the forms for a species with one form', async () => {
    await show(sylveon as PokeboxEntry);
    expect(screen.queryByRole('heading', { name: 'Forms' })).not.toBeInTheDocument();
  });

  it('starts on the Pokémon that was looked up', async () => {
    await show(vulpix);
    expect(screen.getByRole('button', { name: 'Default Form' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Alolan Form' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('fire')).toBeInTheDocument();
  });

  it("shows the selected form's description, types, abilities and sprites", async () => {
    const card = await show(vulpix);
    fireEvent.click(screen.getByRole('button', { name: 'Alolan Form' }));
    await card.updateComplete;

    expect(screen.getByRole('button', { name: 'Alolan Form' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/It exhales air colder than -58 degrees/)).toBeInTheDocument();
    expect(screen.getByText('ice')).toBeInTheDocument();
    expect(screen.queryByText('fire')).not.toBeInTheDocument();
    expect(screen.getByText('snow-cloak')).toBeInTheDocument();
    expect(screen.queryByText('flash-fire')).not.toBeInTheDocument();
    expect(screen.getByAltText('vulpix-alola sprite')).toHaveAttribute(
      'src',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10103.png',
    );
    // The heading stays the Pokémon that was looked up.
    expect(screen.getByRole('heading', { level: 1, name: 'vulpix' })).toBeInTheDocument();
  });

  it('goes back to the looked-up form when shown a different Pokémon', async () => {
    const card = await show(vulpix);
    fireEvent.click(screen.getByRole('button', { name: 'Alolan Form' }));
    await card.updateComplete;

    card.pokemon = { ...vulpix, varieties: [...vulpix.varieties] };
    await card.updateComplete;
    expect(screen.getByRole('button', { name: 'Default Form' })).toHaveAttribute('aria-pressed', 'true');
  });
});
