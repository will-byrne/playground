import { Elysia } from "elysia";
import { openapi } from "@elysia/openapi";
import { getPokedex, getPokemon } from "./pokebox";
import { getRandomUnseenDexNo } from "./get-random-unseen-dex-no";

// Mirrors the CORS fairing in rust-server: the same static headers on every response.
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, PATCH, GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Credentials": "true",
} as const;

export const app = new Elysia()
  .use(openapi())
  .onRequest(({ request, set }) => {
    Object.assign(set.headers, CORS_HEADERS);
    // rust-server answers OPTIONS on any path with 204 No Content.
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
  })
  .get("/", () => "Hello, World!")
  .get("/pokemon/random-new", async ({ set }) => {
    try {
      const seenPokemon = (await getPokedex()).map(({ id }) => id);
      const num = getRandomUnseenDexNo(seenPokemon);
      return await getPokemon(num.toString());
    } catch (error) {
      console.error("Could not find random new pokemon", error);
      set.status = 500;
      return "Internal Server Error";
    }
  })
  .get("/pokemon/:idOrName", async ({ params: { idOrName }, set }) => {
    try {
      return await getPokemon(idOrName);
    } catch (error) {
      console.error(`Could not find pokemon with id or name: ${idOrName}`, error);
      set.status = 404;
      return "Not Found";
    }
  })
  .get("/pokedex", () => getPokedex());
