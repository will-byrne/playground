import { type Context, Hono } from 'hono';
import { prettyJSON } from 'hono/pretty-json';
import { getPokedex, getPokemonById, getPokemonByName } from './storage';
import { getRandomNoExcludeRange } from './get-random-no-exclude-range';
import { statusFor } from './errors';
import { normalizeIdentifier } from './identifier';

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

const STATUS_TEXT = { 404: 'Not Found', 500: 'Internal Server Error', 502: 'Bad Gateway' } as const;

/** Answers with the rust-server status for `error`: 404, 502 or 500. */
const errorResponse = (c: Context, message: string, error: unknown) => {
  const status = statusFor(error);
  if (status !== 404) console.error(message, error);
  return c.text(STATUS_TEXT[status], status);
};

app.get('/', (c) => {
  return c.text('Hello, World!');
});

app.get('/pokemon/random-new', async (c) => {
  try {
    const cachedPokemon = (await getPokedex()).map(({ id }) => id);
    const num = getRandomNoExcludeRange(cachedPokemon);
    // Every Pokémon is already stored.
    if (num === undefined) return c.text(STATUS_TEXT[404], 404);
    const pokemon = await getPokemonById(num);
    return c.json(pokemon);
  } catch (error) {
    return errorResponse(c, 'Could not find random new Pokemon', error);
  }
});

app.get('/pokemon/:idOrName', async (c) => {
  const idOrName = normalizeIdentifier(c.req.param('idOrName'));
  if (idOrName === undefined) return c.text(STATUS_TEXT[404], 404);
  try {
    // Matches rust-server's `id_or_name.parse::<i64>()`: an optionally signed integer is an id.
    const pokemon = /^[+-]?\d+$/.test(idOrName)
      ? await getPokemonById(Number(idOrName))
      : await getPokemonByName(idOrName);
    return c.json(pokemon);
  } catch (error) {
    return errorResponse(c, `Could not find Pokemon with id or name: ${idOrName}`, error);
  }
});

app.get('/pokedex', async (c) => {
  try {
    return c.json(await getPokedex());
  } catch (error) {
    return errorResponse(c, 'Could not get the pokedex', error);
  }
});

export default app;
