import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Config, Layer } from "effect";
import { HttpRouter } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { PokeboxApi } from "./api";
import { SystemHandlers } from "./handlers";

// A server is a stack of Layers:
//   routes (the API + its handlers)
//   -> HttpRouter.serve, which needs an HttpServer
//   -> BunHttpServer, which provides one
//   -> Layer.launch + BunRuntime.runMain, which run it until SIGINT/SIGTERM.

const ApiRoutes = HttpApiBuilder.layer(PokeboxApi).pipe(Layer.provide(SystemHandlers));

const Server = HttpRouter.serve(ApiRoutes).pipe(
  Layer.provide(
    BunHttpServer.layerConfig({
      port: Config.Port("PORT").pipe(Config.withDefault(3000)),
    }),
  ),
);

Layer.launch(Server).pipe(BunRuntime.runMain);
