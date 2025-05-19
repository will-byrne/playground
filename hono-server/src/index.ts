import { Hono } from 'hono';
import { prettyJSON } from 'hono/pretty-json';
import { getPokedex, getPokemonById } from './storage';
import { cors } from 'hono/cors';

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

app.get('/pokemon/:id', async (c) => {
  c.header('Access-Control-Allow-Origin');
  const id = Number.parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.text(`Invalid id: ${id}, must be a number`);
  }
  try {
    const pokemon = await getPokemonById(id);
    return c.json(pokemon);
  } catch {
    return c.text(`Could not find Pokemon with id: ${id}`);
  }
});

app.get('/pokedex', async (c) => {
  const pokedex = await getPokedex();
  c.header('Access-Control-Allow-Origin');
  return c.json(pokedex);
});

export default app
