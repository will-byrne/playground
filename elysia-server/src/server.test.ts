import { describe, expect, it, mock } from 'bun:test';
import { PokeboxEntry } from './model';

const mockPokedex = [
  { id: 1, name: 'bulbasaur' },
  { id: 25, name: 'pikachu' }
];

const mockPokemon: Omit<PokeboxEntry, '_id'> = {
    id: 1,
    name: 'Bulbasaur',
    species_description: 'Its a bulbasaur',
    types: ['grass'],
    sprites: {
      front_default: null,
      front_shiny: null,
      front_female: null,
      front_shiny_female: null,
      back_default: null,
      back_shiny: null,
      back_female: null,
      back_shiny_female: null,
    } as PokeboxEntry['sprites'],
    abilities: [{ name: 'overgrow', flavour_text: 'Ups GRASS moves in a pinch.', effect: 'Powers up Grass-type moves when the Pokémon\'s HP is low.' }]
}

const getPokemon = mock(async (idOrName: string) => {
  if (idOrName === '0' || idOrName === 'missingno') throw new Error('Not found');
  return mockPokemon;
});
const getPokedex = mock(async () => mockPokedex);

mock.module('./pokebox', () => ({ getPokedex, getPokemon }));

const { app } = await import('./server');

const request = (path: string, init?: RequestInit) =>
  app.handle(new Request(`http://localhost${path}`, init));

describe('Server (rust-server contract)', () => {
  it('returns a response to root', async () => {
    const response = await request('/');

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('Hello, World!');
  });

  it('returns the pokedex', async () => {
    const response = await request('/pokedex');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockPokedex);
  });

  it('returns a pokemon when presented a valid id', async () => {
    const response = await request('/pokemon/1');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockPokemon);
  });

  it('returns 404 when the pokemon cannot be found', async () => {
    expect((await request('/pokemon/0')).status).toBe(404);
    expect((await request('/pokemon/missingno')).status).toBe(404);
  });

  it('returns a random new pokemon', async () => {
    const response = await request('/pokemon/random-new');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockPokemon);
  });

  it('returns 500 when a random new pokemon cannot be fetched', async () => {
    getPokemon.mockImplementationOnce(async () => { throw new Error('boom'); });

    expect((await request('/pokemon/random-new')).status).toBe(500);
  });

  it('answers OPTIONS on any path with 204', async () => {
    const response = await request('/anything/at/all', { method: 'OPTIONS' });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('sends the rust-server CORS headers', async () => {
    const response = await request('/pokedex', { headers: { Origin: 'http://example.com' } });

    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-allow-methods')).toBe('POST, PATCH, GET, DELETE, OPTIONS');
    expect(response.headers.get('access-control-allow-headers')).toBe('*');
    expect(response.headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('sends CORS headers on error responses', async () => {
    const response = await request('/pokemon/0');

    expect(response.headers.get('access-control-allow-origin')).toBe('*');
  });
});
