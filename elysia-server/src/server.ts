import { Elysia } from "elysia";
import { openapi } from "@elysia/openapi";
import { cors } from '@elysia/cors';
import { getPokedex, getPokemon } from "./pokebox";
import { getRandomUnseenDexNo } from "./get-random-unseen-dex-no";

export const app = new Elysia()
  .use(openapi())
  .use(cors())
  .get("/", () => "Hello Elysia")
  .get("/pokemon/random-new", async () => {
    try {
      const seenPokemon = (await getPokedex()).map(({ id }) => id);
      const num = getRandomUnseenDexNo(seenPokemon);
      const pokemon = await getPokemon(num.toString());
      return pokemon;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `Could not find random new pokemon: ${message}`;
    }
  })
  .get("/pokemon/:idOrName", async ({ params: { idOrName }}) => {
    try {
      console.log('idOrName: ', idOrName);
      const pokemon = await getPokemon(idOrName);
      console.log('Found pokemon: ', pokemon.name);
      return pokemon;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `Could not find pokemon with id or name: ${idOrName}, ${message}`;
    }
  })
  .get("/pokedex", async () => { return getPokedex() });

