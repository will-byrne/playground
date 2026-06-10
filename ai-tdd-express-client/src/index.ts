import express from 'express';
import { getPokedex, getPokemonById, getPokemonByName } from './storage';
import { getRandomNoExcludeRange } from './get-random-no-exclude-range';

const port = process.env.PORT || 3000;
const app = express();

app.get('/', (req, res) => {
  return res.send("Hello, World!");
});

app.get('/pokemon/random-new', async (req, res) => {
  res.header('Access-Control-Allow-Origin');
  try {
    const cachedPokemon = (await getPokedex()).map(({ id }) => id);
    const num = getRandomNoExcludeRange(cachedPokemon);
    const pokemon = await getPokemonById(num);
    return res.json(pokemon);
  } catch {
    return res.send(`Could not find random new Pokemon`);
  }
})

app.get('/pokemon/:idOrName', async (req, res) => {
  res.header('Access-Control-Allow-Origin');
  const idOrName = req.params.idOrName;
  const id = Number.parseInt(idOrName);
  if (isNaN(id)) {
    try {
      const pokemon = await getPokemonByName(idOrName)
      return res.json(pokemon);
    } catch {
      return res.send(`Could not find Pokemon with name: ${idOrName}`);
    }
  } else {
    try {
      const pokemon = await getPokemonById(id);
      return res.json(pokemon);
    } catch {
      return res.send(`Could not find Pokemon with id: ${id}`);
    }
  }
});

app.get('/pokedex', async (req, res) => {
  const pokedex = await getPokedex();
  res.header('Access-Control-Allow-Origin');
  return res.json(pokedex);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})