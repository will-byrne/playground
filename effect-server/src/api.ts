import { Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/http-api";

// What the server exposes, not how it works: the handlers live in
// handlers.ts. Keeping the definition separate means tests (and a typed
// client, if you ever want one) can use it without the server code.

/** `GET /`: the health check every server answers. */
export class SystemApi extends HttpApiGroup.make("system", { topLevel: true }).add(
  HttpApiEndpoint.get("index", "/", {
    // asText makes this text/plain rather than a JSON string.
    success: Schema.String.pipe(HttpApiSchema.asText()),
  }),
) {}

export class PokeboxApi extends HttpApi.make("pokebox").add(SystemApi) {}
