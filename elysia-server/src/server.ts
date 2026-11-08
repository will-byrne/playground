import { Elysia } from "elysia";
import { openapi } from "@elysia/openapi";
import { getPokedex, getPokemon } from "./pokebox";
import { getRandomUnseenDexNo } from "./get-random-unseen-dex-no";
import { statusFor } from "./errors";
import { normalizeIdentifier } from "./identifier";

// Mirrors the CORS fairing in rust-server: the same static headers on every response.
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, PATCH, GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Credentials": "true",
} as const;

const STATUS_TEXT = { 404: "Not Found", 500: "Internal Server Error", 502: "Bad Gateway" } as const;

/** Sets the rust-server status for `error` (404, 502 or 500) and returns its text. */
const errorResponse = (set: { status?: number | string }, message: string, error: unknown) => {
  const status = statusFor(error);
  if (status !== 404) console.error(message, error);
  set.status = status;
  return STATUS_TEXT[status];
};

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
      // Every Pokémon is already stored.
      if (num === undefined) {
        set.status = 404;
        return STATUS_TEXT[404];
      }
      return await getPokemon(num.toString());
    } catch (error) {
      return errorResponse(set, "Could not find random new pokemon", error);
    }
  })
  .get("/pokemon/:idOrName", async ({ params, set }) => {
    const idOrName = normalizeIdentifier(params.idOrName);
    if (idOrName === undefined) {
      set.status = 404;
      return STATUS_TEXT[404];
    }
    try {
      return await getPokemon(idOrName);
    } catch (error) {
      return errorResponse(set, `Could not find pokemon with id or name: ${idOrName}`, error);
    }
  })
  .get("/pokedex", async ({ set }) => {
    try {
      return await getPokedex();
    } catch (error) {
      return errorResponse(set, "Could not get the pokedex", error);
    }
  });
