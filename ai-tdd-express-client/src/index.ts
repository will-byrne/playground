import { Hono } from 'hono';
import { prettyJSON } from 'hono/pretty-json';
import { getPokedex, getPokemonById, getPokemonByName } from './storage';
import { cors } from 'hono/cors';
import { getRandomNoExcludeRange } from './get-random-no-exclude-range';

const app = new Hono();
app.use(
  cors({
    origin: ["http://localhost:5173"],
  })
);
app.use('*', prettyJSON());
app.get('/', (c) => {
  return c.text("Hello, World!");
});

app.get('/pokemon/random-new', async (c) => {
  c.header('Access-Control-Allow-Origin');
  try {
    const cachedPokemon = (await getPokedex()).map(({ id }) => id);
    const num = getRandomNoExcludeRange(cachedPokemon);
    const pokemon = await getPokemonById(num);
    return c.json(pokemon);
  } catch {
    return c.text(`Could not find random new Pokemon`);
  }
})

app.get('/pokemon/:idOrName', async (c) => {
  c.header('Access-Control-Allow-Origin');
  const idOrName = c.req.param('idOrName');
  const id = Number.parseInt(idOrName);
  if (isNaN(id)) {
    try {
      const pokemon = await getPokemonByName(idOrName)
      return c.json(pokemon);
    } catch {
      return c.text(`Could not find Pokemon with name: ${idOrName}`);
    }
  } else {
    try {
      const pokemon = await getPokemonById(id);
      return c.json(pokemon);
    } catch {
      return c.text(`Could not find Pokemon with id: ${id}`);
    }
  }
});

app.get('/pokedex', async (c) => {
  const pokedex = await getPokedex();
  c.header('Access-Control-Allow-Origin');
  return c.json(pokedex);
});

export default app
