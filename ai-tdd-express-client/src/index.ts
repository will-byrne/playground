import express from 'express';
import { getRandomNoExcludeRange } from './get-random-no-exclude-range';
import { PokemonSprites } from 'pokenode-ts';
import { getPokedex, getPokemon } from './pokebox';

export type PokeboxEntry = {
  id: number,
  name: string,
  species_description: string,
  types: string[],
  sprites: PokemonSprites,
  abilities: {
    name: string,
    flavour_text: string,
    effect: string,
  }[]
}

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
    const pokemon = await getPokemon(num);
    return res.json(pokemon);
  } catch {
    return res.send(`Could not find random new Pokemon`);
  }
})

app.get('/pokemon/:idOrName', async (req, res) => {
  res.header('Access-Control-Allow-Origin');
  const idOrName = req.params.idOrName;
  const pokemon = await getPokemon(idOrName)
  return res.json(pokemon);
});

app.get('/pokedex', async (req, res) => {
  const pokedex = await getPokedex();
  res.header('Access-Control-Allow-Origin');
  return res.json(pokedex);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})