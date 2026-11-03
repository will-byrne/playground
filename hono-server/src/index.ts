import { Hono } from 'hono';
import { prettyJSON } from 'hono/pretty-json';
import { getPokedex, getPokemonById, getPokemonByName } from './storage';
import { getRandomNoExcludeRange } from './get-random-no-exclude-range';

// Mirrors the CORS fairing in rust-server: the same static headers on every response.
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, PATCH, GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Credentials': 'true',
} as const;

const app = new Hono();

app.use('*', async (c, next) => {
  await next();
  for (const [name, value] of Object.entries(CORS_HEADERS)) {
    c.res.headers.set(name, value);
  }
});
app.use('*', prettyJSON());

// rust-server answers OPTIONS on any path with 204 No Content.
app.options('*', (c) => c.body(null, 204));

app.get('/', (c) => {
  return c.text('Hello, World!');
});

app.get('/pokemon/random-new', async (c) => {
  try {
    const cachedPokemon = (await getPokedex()).map(({ id }) => id);
    const num = getRandomNoExcludeRange(cachedPokemon);
    const pokemon = await getPokemonById(num);
    return c.json(pokemon);
  } catch (error) {
    console.error('Could not find random new Pokemon', error);
    return c.text('Internal Server Error', 500);
  }
});

app.get('/pokemon/:idOrName', async (c) => {
  const idOrName = c.req.param('idOrName');
  try {
    // Matches rust-server's `id_or_name.parse::<i64>()`: an optionally signed integer is an id.
    const pokemon = /^[+-]?\d+$/.test(idOrName)
      ? await getPokemonById(Number(idOrName))
      : await getPokemonByName(idOrName);
    return c.json(pokemon);
  } catch (error) {
    console.error(`Could not find Pokemon with id or name: ${idOrName}`, error);
    return c.text('Not Found', 404);
  }
});

app.get('/pokedex', async (c) => {
  return c.json(await getPokedex());
});

export default app;
