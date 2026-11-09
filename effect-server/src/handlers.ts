import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { PokeboxApi } from "./api";

/** Handlers for the `system` group: `GET /`. */
export const SystemHandlers = HttpApiBuilder.group(PokeboxApi, "system", (handlers) =>
  handlers.handle("index", () => Effect.succeed("Hello, World!")),
);
