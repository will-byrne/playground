import { describe, expect, it, mock } from 'bun:test';
import { PokeboxEntry } from './model';
import { PokeboxError } from './errors';

const mockPokedex = [
  { id: 1, name: 'bulbasaur' },
  { id: 25, name: 'pikachu' }
];

const mockPokemon: Omit<PokeboxEntry, '_id'> = {
    id: 1,
    name: 'Bulbasaur',
    form_name: '',
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
    abilities: [{ name: 'overgrow', flavour_text: 'Ups GRASS moves in a pinch.', effect: 'Powers up Grass-type moves when the Pokémon\'s HP is low.' }],
    varieties: [],
}

const notFound = () => new PokeboxError('not_found', 'no such pokemon');
const pokeApiDown = () => new PokeboxError('upstream', 'timed out');
const dbDown = () => new PokeboxError('db', 'connection refused');

const getPokemon = mock(async (idOrName: string) => {
  if (['0', '-1', '99999', 'missingno'].includes(idOrName)) throw notFound();
  return mockPokemon;
});
const getPokedex = mock(async (): Promise<{ id: number; name: string }[]> => mockPokedex);

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
    for (const path of ['/pokemon/0', '/pokemon/-1', '/pokemon/99999', '/pokemon/missingno']) {
      expect((await request(path)).status).toBe(404);
    }
  });

  it('returns 404 for names that cannot exist, without a lookup', async () => {
    getPokemon.mockClear();
    for (const path of ['/pokemon/%C2%84', '/pokemon/%13', '/pokemon/a%20b', '/pokemon/1.5']) {
      expect((await request(path)).status).toBe(404);
    }
    expect(getPokemon).not.toHaveBeenCalled();
  });

  it('looks names up case-insensitively', async () => {
    getPokemon.mockClear();
    expect((await request('/pokemon/Pikachu')).status).toBe(200);
    expect(getPokemon).toHaveBeenCalledWith('pikachu');
  });

  it('returns 502, not 404, when PokeAPI fails', async () => {
    getPokemon.mockImplementationOnce(async () => { throw pokeApiDown(); });
    expect((await request('/pokemon/1')).status).toBe(502);
  });

  it('returns 500, not 404, when the database fails', async () => {
    getPokemon.mockImplementationOnce(async () => { throw dbDown(); });
    expect((await request('/pokemon/1')).status).toBe(500);
  });

  it('returns 500 for unexpected errors', async () => {
    getPokemon.mockImplementationOnce(async () => { throw new Error('boom'); });
    expect((await request('/pokemon/1')).status).toBe(500);
  });

  it('returns 500 from the pokedex when the database fails, not an empty list', async () => {
    getPokedex.mockImplementationOnce(async () => { throw dbDown(); });
    expect((await request('/pokedex')).status).toBe(500);
  });

  it('returns a random new pokemon', async () => {
    const response = await request('/pokemon/random-new');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockPokemon);
  });

  it('returns 404 from random-new once every pokemon is stored', async () => {
    const everything = Array.from({ length: 1025 }, (_, i) => ({ id: i + 1, name: `pokemon-${i + 1}` }));
    getPokedex.mockImplementationOnce(async () => everything);

    expect((await request('/pokemon/random-new')).status).toBe(404);
  });

  it('returns 502 from random-new when PokeAPI fails', async () => {
    getPokemon.mockImplementationOnce(async () => { throw pokeApiDown(); });

    expect((await request('/pokemon/random-new')).status).toBe(502);
  });

  it('returns 500 from random-new when the database fails', async () => {
    getPokedex.mockImplementationOnce(async () => { throw dbDown(); });

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
    getPokemon.mockImplementationOnce(async () => { throw dbDown(); });
    for (const path of ['/pokemon/0', '/pokemon/1']) {
      const response = await request(path);

      expect(response.headers.get('access-control-allow-origin')).toBe('*');
    }
  });
});
