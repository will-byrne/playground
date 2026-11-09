# effect-server
The Pokébox contract ([`contract/openapi.yaml`](../contract/openapi.yaml)) written with [Effect](https://effect.website) 4, on Bun. It runs on port 3005.

The project, Docker, Nix and test wiring are in place; the server itself is yours to write. `hono-server` is the smallest port source: same routes and rules, plain TypeScript.

## Effect 4 notes
- HTTP is part of `effect` itself now: `effect/http` (`HttpRouter`, `HttpServer`, `HttpClient`, `HttpMiddleware`, ...) and `effect/http-api` (`HttpApi`, `HttpApiGroup`, `HttpApiEndpoint`, `HttpApiBuilder`, `HttpApiSchema`, `HttpApiTest`, `OpenApi`). There's no `@effect/platform` package any more; guides that import from it are for Effect 3.
- `@effect/platform-bun` gives `BunHttpServer` and `BunRuntime` (to run the main Effect).
- `Schema`, `Config`, `Layer`, `Context`, `Data`, `Duration` all come from `effect`.

## Suggested order
1. **Schemas** (`src/schema.ts`): `PokedexEntry`, `PokeboxEntry` (port the types in `hono-server/src/storage.ts`), and `IdOrName` with the rule in `hono-server/src/identifier.ts` (trim, lowercase, `^[a-z0-9-]{1,64}$`). Try `Schema.brand` with a transformation.
2. **Errors** (`src/errors.ts`): `NotFound` → 404, `Upstream` → 502, `Db` → 500, as `Schema.TaggedError`s with their HTTP status attached as an `httpApiStatus` annotation (see `HttpApiSchema`). Compare `hono-server/src/errors.ts`.
3. **API definition** (`src/api.ts`): one `HttpApi` and one group with the 4 endpoints, each declaring its success schema and the errors it can fail with. Make an invalid `idOrName` come out as 404, not the default 400.
4. **`PokeApi` service**: a `Context` tag plus a `Layer` built on `HttpClient`. `GET https://pokeapi.co/api/v2/pokemon/{key}`: 404 → `NotFound`, anything else → `Upstream`; then the species and abilities (English text, with the same fallbacks as `hono-server/src/storage.ts`).
5. **`PokeboxStore` service**: wrap the `mongodb` driver with `Effect.tryPromise` → `Db`. Find by id or name, the pokedex (sorted by id), upsert by id, and at startup create the unique index `{ id: 1 }` (logging a warning if that fails, not crashing). Use a 5s `serverSelectionTimeoutMS` like the other servers. Try `Effect.acquireRelease` for the client.
6. **Handlers** (`src/handlers.ts`): `HttpApiBuilder.group(...)`. `random-new` picks an uncaught id in 1..1025 (`hono-server/src/get-random-no-exclude-range.ts`).
7. **CORS**: `Access-Control-Allow-Origin: *` on every response, errors included, and 204 for `OPTIONS` on any path.
8. **`src/index.ts`**: wire the Layers together (`Config` for `PORT` and `MONGODB_URI`) and launch with `BunRuntime.runMain`.

## Checking your work
- `bun test` runs `src/server.test.ts`, a checklist of `test.todo`s for the contract's behaviours; `bun test --todo` shows which are still open. `HttpApiTest.groups` gives an in-memory client for your API, so handlers can be tested against test Layers without a real server.
- The contract suite and fuzzing are the real scoreboard. Run `docker compose up -d --build mongodb effect-server` from the repo root, then:
  - `cd ../contract && BASE_URL=http://localhost:3005 bun test`
  - `cd ../contract && BASE_URL=http://localhost:3005 bun run fuzz`
  - `cd ../contract && bun run matrix` compares it with the other servers.
- Once it passes, uncomment effect-server in `.github/workflows/contract.yml` so CI checks it too.
- Bonus: generate an OpenAPI document from your `HttpApi` (`OpenApi.fromApi`) and diff it against `contract/openapi.yaml`.
