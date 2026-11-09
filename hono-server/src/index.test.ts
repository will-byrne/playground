import { beforeAll, describe, expect, it, mock } from 'bun:test';
import type { PokeboxEntry } from './storage';
import { PokeboxError } from './errors';

const mockPokedex = [
  { name: 'bulbasaur', id: 1 },
  { name: 'pikachu', id: 25 },
];

const mockPokemon = {
  name: 'bulbasaur',
  id: 1,
  form_name: '',
  species_description: 'A strange seed was planted on its back at birth.',
  types: ['grass', 'poison'],
  abilities: [{ name: 'overgrow', flavour_text: 'Ups GRASS moves in a pinch.', effect: 'Strengthens grass moves to inflict 1.5× damage at 1/3 max HP or less.' }],
  sprites: { front_default: null } as unknown as PokeboxEntry['sprites'],
  varieties: [],
} satisfies PokeboxEntry;

const notFound = () => new PokeboxError('not_found', 'no such pokemon');
const pokeApiDown = () => new PokeboxError('upstream', 'timed out');
const dbDown = () => new PokeboxError('db', 'connection refused');

const getPokemonById = mock(async (id: number) => {
  if (id <= 0 || id > 1025) throw notFound();
  return { ...mockPokemon, id };
});
const getPokemonByName = mock(async (name: string) => {
  if (name === 'missingno') throw notFound();
  return { ...mockPokemon, name };
});
const getPokedex = mock(async (): Promise<{ name: string; id: number }[]> => mockPokedex);

mock.module('./storage', () => ({ getPokedex, getPokemonById, getPokemonByName }));

let app: typeof import('./index').default;
beforeAll(async () => {
  app = (await import('./index')).default;
});

describe('hono-server (rust-server contract)', () => {
  it('returns Hello, World! at root', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Hello, World!');
  });

  it('returns the pokedex', async () => {
    const res = await app.request('/pokedex');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(mockPokedex);
  });

  it('looks up integers by id and everything else by name', async () => {
    expect(await (await app.request('/pokemon/5')).json()).toMatchObject({ id: 5 });
    expect(await (await app.request('/pokemon/25abc')).json()).toMatchObject({ name: '25abc' });
  });

  it('returns 404 when the pokemon cannot be found', async () => {
    for (const path of ['/pokemon/0', '/pokemon/-1', '/pokemon/99999', '/pokemon/missingno']) {
      expect((await app.request(path)).status).toBe(404);
    }
  });

  it('returns 404 for names that cannot exist, without a lookup', async () => {
    getPokemonById.mockClear();
    getPokemonByName.mockClear();
    for (const path of ['/pokemon/%C2%84', '/pokemon/%13', '/pokemon/a%20b', '/pokemon/1.5']) {
      expect((await app.request(path)).status).toBe(404);
    }
    expect(getPokemonById).not.toHaveBeenCalled();
    expect(getPokemonByName).not.toHaveBeenCalled();
  });

  it('looks names up case-insensitively', async () => {
    getPokemonByName.mockClear();
    expect((await app.request('/pokemon/Pikachu')).status).toBe(200);
    expect(getPokemonByName).toHaveBeenCalledWith('pikachu');
  });

  it('returns a random new pokemon not already in the pokedex', async () => {
    const res = await app.request('/pokemon/random-new');
    expect(res.status).toBe(200);
    const { id } = await res.json();
    expect(id).toBeGreaterThanOrEqual(1);
    expect(id).toBeLessThanOrEqual(1025);
    expect(mockPokedex.map((p) => p.id)).not.toContain(id);
  });

  it('returns 404 from random-new once every pokemon is stored', async () => {
    const everything = Array.from({ length: 1025 }, (_, i) => ({ name: `pokemon-${i + 1}`, id: i + 1 }));
    getPokedex.mockImplementationOnce(async () => everything);
    expect((await app.request('/pokemon/random-new')).status).toBe(404);
  });

  it('returns 502 from random-new when PokeAPI fails', async () => {
    getPokemonById.mockImplementationOnce(async () => { throw pokeApiDown(); });
    expect((await app.request('/pokemon/random-new')).status).toBe(502);
  });

  it('returns 500 from random-new when the database fails', async () => {
    getPokedex.mockImplementationOnce(async () => { throw dbDown(); });
    expect((await app.request('/pokemon/random-new')).status).toBe(500);
  });

  it('returns 502, not 404, when PokeAPI fails', async () => {
    getPokemonById.mockImplementationOnce(async () => { throw pokeApiDown(); });
    expect((await app.request('/pokemon/1')).status).toBe(502);
    getPokemonByName.mockImplementationOnce(async () => { throw pokeApiDown(); });
    expect((await app.request('/pokemon/bulbasaur')).status).toBe(502);
  });

  it('returns 500, not 404, when the database fails', async () => {
    getPokemonById.mockImplementationOnce(async () => { throw dbDown(); });
    expect((await app.request('/pokemon/1')).status).toBe(500);
  });

  it('returns 500 for unexpected errors', async () => {
    getPokemonById.mockImplementationOnce(async () => { throw new Error('boom'); });
    expect((await app.request('/pokemon/1')).status).toBe(500);
  });

  it('returns 500 from the pokedex when the database fails, not an empty list', async () => {
    getPokedex.mockImplementationOnce(async () => { throw dbDown(); });
    expect((await app.request('/pokedex')).status).toBe(500);
  });

  it('answers OPTIONS on any path with 204', async () => {
    const res = await app.request('/anything/at/all', { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('sends the rust-server CORS headers, including on errors', async () => {
    getPokemonById.mockImplementationOnce(async () => { throw dbDown(); });
    for (const path of ['/pokedex', '/pokemon/0', '/pokemon/1']) {
      const res = await app.request(path, { headers: { Origin: 'http://example.com' } });
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
      expect(res.headers.get('access-control-allow-methods')).toBe('POST, PATCH, GET, DELETE, OPTIONS');
      expect(res.headers.get('access-control-allow-headers')).toBe('*');
      expect(res.headers.get('access-control-allow-credentials')).toBe('true');
    }
  });
});
