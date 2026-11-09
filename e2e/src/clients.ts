// How to start each web client for the e2e tests, and where its backends are.
//
// The browser-side clients call the backends at the localhost URLs in
// pokedex.ts (ports 3000-3004); the tests reroute those requests to WireMock
// (see test.ts). Remix and SvelteKit also fetch on the server, so they're
// pointed at WireMock with the BACKEND_URL_* variables pokedex.ts reads.
// WireMock answers each backend differently (wiremock/mappings): elysia and
// rust serve the fixtures, go fails with 500, hono with 502, and java resets
// the connection.

import { BACKENDS, type Backend, type Client } from "./pokedex.ts";

export const WIREMOCK_URL = process.env.WIREMOCK_URL ?? "http://localhost:3999";

/** The docker container the suite runs WireMock in, unless WIREMOCK_URL is set. */
export const WIREMOCK_CONTAINER = "playground-e2e-wiremock";

/** The URL WireMock serves `backend` under. */
export const wiremockBackendUrl = (backend: Backend) => `${WIREMOCK_URL}/${backend}`;

/** The backend a localhost backend port belongs to, e.g. 3000 → rust. */
export const backendForPort = (port: string): Backend | undefined =>
  (Object.keys(BACKENDS) as Backend[]).find((backend) => new URL(BACKENDS[backend].url).port === port);

/** BACKEND_URL_* for clients that fetch on the server. */
export const serverBackendEnv = Object.fromEntries(
  (Object.keys(BACKENDS) as Backend[]).map((backend) => [
    `BACKEND_URL_${backend.toUpperCase()}`,
    wiremockBackendUrl(backend),
  ]),
);

type ClientSetup = {
  /** The client's directory, relative to the repo root. */
  dir: string;
  /** Port the tests run it on: 41xx, so they don't clash with docker compose's 40xx. */
  port: number;
  /** Starts its dev server on `port`. */
  command: (port: number) => string;
};

const vite = (port: number) => `bunx vite --port ${port} --strictPort`;

export const CLIENT_SETUPS: Record<Client, ClientSetup> = {
  angular: { dir: "angular-client", port: 4101, command: (port) => `bunx ng serve --port ${port}` },
  lit: { dir: "lit-client", port: 4102, command: (port) => `bunx tsc && bunx web-dev-server --port ${port} --open false` },
  mantine: { dir: "mantine-client", port: 4103, command: vite },
  react: { dir: "react-client", port: 4104, command: vite },
  remix: { dir: "remix-client", port: 4105, command: (port) => `bunx remix vite:dev --port ${port} --strictPort` },
  svelte: { dir: "svelt-client", port: 4106, command: vite },
  tsrx: { dir: "tsrx-client", port: 4107, command: vite },
};

export const isClient = (value: string | undefined): value is Client =>
  value !== undefined && Object.prototype.hasOwnProperty.call(CLIENT_SETUPS, value);
