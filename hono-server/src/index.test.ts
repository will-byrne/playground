import { beforeAll, describe, expect, it, mock } from 'bun:test';
import type { PokeboxEntry } from './storage';

const mockPokedex = [
  { name: 'bulbasaur', id: 1 },
  { name: 'pikachu', id: 25 },
];

const mockPokemon = {
  name: 'bulbasaur',
  id: 1,
  species_description: 'A strange seed was planted on its back at birth.',
  types: ['grass', 'poison'],
  abilities: [{ name: 'overgrow', flavour_text: 'Ups GRASS moves in a pinch.', effect: 'Strengthens grass moves to inflict 1.5× damage at 1/3 max HP or less.' }],
  sprites: { front_default: null } as unknown as PokeboxEntry['sprites'],
} satisfies PokeboxEntry;

const getPokemonById = mock(async (id: number) => {
  if (id === 0) throw new Error('Not found');
  return { ...mockPokemon, id };
});
const getPokemonByName = mock(async (name: string) => {
  if (name === 'missingno') throw new Error('Not found');
  return { ...mockPokemon, name };
});
const getPokedex = mock(async () => mockPokedex);

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
    expect((await app.request('/pokemon/0')).status).toBe(404);
    expect((await app.request('/pokemon/missingno')).status).toBe(404);
  });

  it('returns a random new pokemon not already in the pokedex', async () => {
    const res = await app.request('/pokemon/random-new');
    expect(res.status).toBe(200);
    const { id } = await res.json();
    expect(id).toBeGreaterThanOrEqual(1);
    expect(id).toBeLessThanOrEqual(1025);
    expect(mockPokedex.map((p) => p.id)).not.toContain(id);
  });

  it('returns 500 when a random new pokemon cannot be fetched', async () => {
    getPokemonById.mockImplementationOnce(async () => { throw new Error('boom'); });
    expect((await app.request('/pokemon/random-new')).status).toBe(500);
  });

  it('answers OPTIONS on any path with 204', async () => {
    const res = await app.request('/anything/at/all', { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('sends the rust-server CORS headers, including on errors', async () => {
    for (const path of ['/pokedex', '/pokemon/0']) {
      const res = await app.request(path, { headers: { Origin: 'http://example.com' } });
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
      expect(res.headers.get('access-control-allow-methods')).toBe('POST, PATCH, GET, DELETE, OPTIONS');
      expect(res.headers.get('access-control-allow-headers')).toBe('*');
      expect(res.headers.get('access-control-allow-credentials')).toBe('true');
    }
  });
});
