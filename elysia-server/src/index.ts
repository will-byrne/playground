import { Elysia } from "elysia";
import { cors } from '@elysia/cors';
import { getPokedex, getPokemon } from "./pokebox";
import { getRandomUnseenDexNo } from "./get-random-unseen-dex-no";

const app = new Elysia()
  .use(cors())
  .get("/", () => "Hello Elysia")
  .get("/pokemon/random-new", async () => {
    try {
      const seenPokemon = (await getPokedex()).map(({ id }) => id);
      const num = getRandomUnseenDexNo(seenPokemon);
      const pokemon = await getPokemon(num.toString());
      return pokemon;
    } catch (error) {
      return 'Could not find random new pokemon';
    }
  })
  .get("/pokemon/:idOrName", async ({ params: { idOrName }}) => {
    try {
      return await getPokemon(idOrName);
    } catch (error) {
      return `Could not find pokemon with id or name: ${idOrName}`
    }
  })
  .get("/pokedex", async () => { return getPokedex() })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
