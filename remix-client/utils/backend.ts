export const BACKENDS = {
  elysia: {
    label: "Elysia",
    url: "http://localhost:3001",
  },
  rust: {
    label: "Rust",
    url: "http://localhost:3000",
  },
} as const;

export type Backend = keyof typeof BACKENDS;

export const getBackend = (value: string | null | undefined): Backend =>
  value === "rust" ? "rust" : "elysia";

export const getBackendUrl = (backend: Backend): string =>
  BACKENDS[backend].url;

export const getBackendSearch = (backend: Backend): string =>
  backend === "rust" ? "?backend=rust" : "";

export const getBackendFromRequest = (request: Request): Backend =>
  getBackend(new URL(request.url).searchParams.get("backend"));
