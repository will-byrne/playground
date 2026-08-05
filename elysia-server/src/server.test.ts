import { describe, expect, it, mock } from 'bun:test';

const mockPokedex = [
  { id: 1, name: 'bulbasaur' },
  { id: 25, name: 'pikachu' }
];

mock.module('./pokebox', () => ({
  getPokedex: mock(async () => mockPokedex),
  getPokemon: mock(async (idOrName: string) => ({
    id: Number(idOrName),
    name: 'pikachu',
  })),
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
  })
})
