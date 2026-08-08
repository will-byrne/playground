import { describe, expect, it, mock } from 'bun:test';
import { PokeboxEntry } from './model';

const mockPokedex = [
  { id: 1, name: 'bulbasaur' },
  { id: 25, name: 'pikachu' }
];

const mockPokemon: PokeboxEntry = {
    id: 1,
    name: 'Bulbasaur',
    species_description: 'Its a bulbasaur',
    types: ['grass'],
    sprites: undefined,
    abilities: [{ name: 'overgrow' , flavour_text: 'Ups GRASS moves in a pinch.', effect: 'When this Pokémon has 1/3 or less of its HP remaining, its Grass-type moves inflict 1.5× as much regular damage.'}]
}

mock.module('./pokebox', () => ({
  getPokedex: mock(async () => mockPokedex),
  getPokemon: mock(async (idOrName: string) => mockPokemon),
}));

const { app } = await import('./server');

describe('Server', () => {
  it('returns a response to root', async () => {
    const response = await app
      .handle(new Request('http://localhost/'))
      .then((res) => res.text());

    expect(response).toBe('Hello Elysia');
  });

  it('returns the pokedex', async () => {
    const response = await app
      .handle(new Request('http://localhost/pokedex'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockPokedex);
  });

  it('returns a pokemon when presented a valid id', async () => {
    const response = await app.handle(new Request('http://localhost/pokemon/1'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockPokemon);
  })
})
