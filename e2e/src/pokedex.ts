// Shared Pokédex helpers. This file is copied verbatim into every client
// (angular, lit, mantine, react, remix, svelte, tsrx) so they all show the
// same information in the same way, and into e2e/src so the shared Playwright
// tests expect the same text. Keep the copies in sync, along with the shared
// unit tests next to it in the clients (pokedex.test.ts, pokedex.fixtures.ts
// and pokemon-detail.cases.ts).

export type PokedexEntry = { id: number; name: string };

export type Ability = { name: string; flavour_text: string; effect: string };

/** Another form of a Pokémon's species (Alolan, Mega, ...), complete so it can be shown without another request. */
export type PokemonVariety = {
  id: number;
  name: string;
  /** English form name, e.g. "Alolan Form"; "" when the form has none. */
  form_name: string;
  is_default: boolean;
  species_description: string;
  types: string[];
  abilities: Ability[];
  sprites: object;
};

export type PokeboxEntry = Omit<PokemonVariety, "is_default"> & {
  /** The species' other forms, never this one. */
  varieties: PokemonVariety[];
};

export const DEX_MAX = 1025;
export const FEATURED_IDS = [37, 77, 151, 647, 700];
export const SEARCH_RESULT_LIMIT = 10;

// ---------------------------------------------------------------------------
// Backends
// ---------------------------------------------------------------------------

// Ports match the host ports in the repo's docker-compose.yaml.
export const BACKENDS = {
  elysia: { label: "Elysia", url: "http://localhost:3001" },
  rust: { label: "Rust", url: "http://localhost:3000" },
  go: { label: "Go", url: "http://localhost:3002" },
  hono: { label: "Hono", url: "http://localhost:3003" },
  java: { label: "Java", url: "http://localhost:3004" },
} as const;

export type Backend = keyof typeof BACKENDS;

export const DEFAULT_BACKEND: Backend = "elysia";

export const BACKEND_OPTIONS = (Object.keys(BACKENDS) as Backend[]).map((value) => ({
  value,
  label: BACKENDS[value].label,
}));

export const getBackend = (value: string | null | undefined): Backend =>
  value && Object.prototype.hasOwnProperty.call(BACKENDS, value)
    ? (value as Backend)
    : DEFAULT_BACKEND;

/**
 * The browser always uses the localhost URLs above. Code that fetches on the
 * server (Remix loaders, SvelteKit server loads) runs inside a container in
 * docker compose, where localhost is the container itself, so it can be
 * pointed elsewhere with e.g. `BACKEND_URL_RUST=http://rust-server:3000`.
 */
const getServerBackendUrl = (backend: Backend): string | undefined =>
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    `BACKEND_URL_${backend.toUpperCase()}`
  ];

export const getBackendUrl = (backend: Backend): string =>
  getServerBackendUrl(backend) ?? BACKENDS[backend].url;

export const getBackendSearch = (backend: Backend): string =>
  backend === DEFAULT_BACKEND ? "" : `?backend=${backend}`;

export const getBackendFromSearch = (search: string): Backend =>
  getBackend(new URLSearchParams(search).get("backend"));

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

// Ports match the host ports in the repo's docker-compose.yaml. Each client
// names itself in its own client.ts.
export const CLIENTS = {
  angular: { label: "Angular", url: "http://localhost:4001" },
  lit: { label: "Lit", url: "http://localhost:4002" },
  mantine: { label: "Mantine", url: "http://localhost:4003" },
  react: { label: "React", url: "http://localhost:4004" },
  remix: { label: "Remix", url: "http://localhost:4005" },
  svelte: { label: "Svelte", url: "http://localhost:4006" },
  tsrx: { label: "tsrx", url: "http://localhost:4007" },
} as const;

export type Client = keyof typeof CLIENTS;

export const getAppTitle = (client: Client): string => `${TEXT.title} · ${CLIENTS[client].label}`;

export type ClientLink = { client: Client; label: string; href: string; current: boolean };

/**
 * A link to every client. `path` is the current path and search (e.g.
 * `/pokemon/25?backend=rust`), so switching keeps the same page and backend.
 */
export const getClientLinks = (current: Client, path: string): ClientLink[] =>
  (Object.keys(CLIENTS) as Client[]).map((client) => ({
    client,
    label: CLIENTS[client].label,
    href: `${CLIENTS[client].url}${path}`,
    current: client === current,
  }));

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export class FetchError extends Error {
  readonly status: number;

  constructor(status: number, url: string, statusText: string) {
    super(`error fetching (${url}): ${status} ${statusText}`);
    this.status = status;
  }
}

/**
 * Why a request to the backend failed. Every server follows rust-server's
 * statuses:
 * - `not-found` (404): the Pokémon doesn't exist, or for random-new, every
 *   Pokémon has already been discovered.
 * - `upstream` (502): the backend couldn't get the Pokémon from PokeAPI.
 * - `server` (500, or any other error status): the backend failed, usually
 *   because MongoDB is down.
 * - `unreachable`: no response at all; the backend isn't running or the
 *   request was blocked.
 */
export type FetchErrorKind = "not-found" | "upstream" | "server" | "unreachable";

/**
 * Classifies an error thrown while fetching. Works with `FetchError` and with
 * anything else that carries an HTTP `status` (e.g. Angular's
 * HttpErrorResponse, which uses status 0 for a network failure).
 */
export const getFetchErrorKind = (error: unknown): FetchErrorKind => {
  const status =
    typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
  if (status === 404) return "not-found";
  if (status === 502) return "upstream";
  if (typeof status === "number" && status > 0) return "server";
  // A response that wasn't valid JSON still came from the backend. Checked by
  // name, as the error can come from another realm (e.g. a test environment).
  if (typeof error === "object" && error !== null && "name" in error && error.name === "SyntaxError") {
    return "server";
  }
  // fetch rejects with a TypeError when there's no response at all.
  return "unreachable";
};

export const fetchJson = async <T>(
  url: string,
  fetcher: typeof fetch = globalThis.fetch,
): Promise<T> => {
  const response = await fetcher(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new FetchError(response.status, url, response.statusText);
  }
  return response.json() as Promise<T>;
};

export const fetchPokedex = async (backend: Backend, fetcher?: typeof fetch) =>
  sortPokedex(await fetchJson<PokedexEntry[]>(`${getBackendUrl(backend)}/pokedex`, fetcher));

export const fetchPokemon = (backend: Backend, idOrName: string, fetcher?: typeof fetch) =>
  fetchJson<PokeboxEntry>(
    `${getBackendUrl(backend)}/pokemon/${encodeURIComponent(idOrName)}`,
    fetcher,
  );

export const fetchRandomNewPokemon = (backend: Backend, fetcher?: typeof fetch) =>
  fetchJson<PokeboxEntry>(`${getBackendUrl(backend)}/pokemon/random-new`, fetcher);

// ---------------------------------------------------------------------------
// Copy shown to the user
// ---------------------------------------------------------------------------

/** What went wrong with the backend, for a failure that isn't a missing Pokémon. */
const describeBackendError = (backend: Backend, kind: FetchErrorKind): string => {
  const label = BACKENDS[backend].label;
  switch (kind) {
    case "upstream":
      return `The ${label} backend could not reach PokeAPI. Try again in a moment.`;
    case "unreachable":
      return `Could not connect to the ${label} backend. Is it running?`;
    default:
      return `The ${label} backend ran into a problem. Is its database running?`;
  }
};

export const TEXT = {
  title: "Pokédex Explorer",
  subtitle: "Discover and learn about Pokémon",
  searchTitle: "Search Pokémon",
  backendLabel: "Backend",
  clientNavLabel: "Client",
  searchLabel: "Enter Pokémon name or Pokédex number",
  searchPlaceholder: "e.g. Pikachu, 25...",
  search: "Search",
  random: "Random New Pokémon",
  loading: "Loading…",
  searchResults: "Search Results",
  featured: "Featured Pokémon",
  viewDetails: "View Details",
  statsTitle: "Pokédex Statistics",
  statTotalTitle: "Total Pokémon",
  statTotalDesc: "In this Pokédex",
  statLeftTitle: "Total Pokémon left to discover",
  statLastUpdatedTitle: "Last Updated",
  statLastUpdatedValue: "2024",
  statLastUpdatedDesc: "Data Version",
  browseTitle: "Browse Seen Pokémon",
  browseLabel: "Select a Pokémon to view details",
  browsePlaceholder: "Choose a Pokémon...",
  backToList: "Back to list",
  previous: "← Prev",
  next: "Next →",
  shiny: "Shiny",
  description: "Description",
  abilities: "Abilities",
  sprites: "Sprites",
  selected: "Selected",
  forms: "Forms",
  defaultForm: "Default Form",
  pokedexError: (backend: Backend, kind: FetchErrorKind) =>
    `Could not load the Pokédex. ${describeBackendError(backend, kind)}`,
  randomError: (backend: Backend, kind: FetchErrorKind) =>
    kind === "not-found"
      ? "Every Pokémon has already been discovered, so there are no new ones left!"
      : `Could not find a random new Pokémon. ${describeBackendError(backend, kind)}`,
  /** Heading for the Pokémon page when loading it failed. */
  pokemonErrorTitle: (kind: FetchErrorKind) =>
    kind === "not-found" ? "Pokémon Not Found" : "Could Not Load Pokémon",
  /** Message for the Pokémon page when loading it failed. */
  pokemonError: (idOrName: string, backend: Backend, kind: FetchErrorKind) =>
    kind === "not-found"
      ? `The Pokémon "${idOrName}" could not be found.`
      : `Could not load "${idOrName}". ${describeBackendError(backend, kind)}`,
} as const;

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export const formatDexNo = (id: number): string => `#${id.toString().padStart(3, "0")}`;

export const capitalize = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

export const formatDescription = (value: string): string =>
  value.replace(/[\r\n\f]+/g, " ");

export const formatSpriteName = (key: string): string => key.replace(/[-_]/g, " ");

export const getLeftToDiscover = (pokedex: PokedexEntry[]) => DEX_MAX - pokedex.length;

export const getLeftToDiscoverDesc = (pokedex: PokedexEntry[]) =>
  pokedex.length >= DEX_MAX ? "All discovered!" : "Keep exploring!";

// ---------------------------------------------------------------------------
// Pokédex
// ---------------------------------------------------------------------------

export const sortPokedex = (pokedex: PokedexEntry[]): PokedexEntry[] =>
  [...pokedex].sort((a, b) => a.id - b.id);

export const searchPokedex = (pokedex: PokedexEntry[], query: string): PokedexEntry[] => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];
  return pokedex
    .filter(({ id, name }) => name.toLowerCase().includes(trimmed) || id.toString().includes(trimmed))
    .slice(0, SEARCH_RESULT_LIMIT);
};

export const getFeaturedPokemon = (pokedex: PokedexEntry[]): PokedexEntry[] =>
  FEATURED_IDS.map((id) => pokedex.find((pokemon) => pokemon.id === id)).filter(
    (pokemon): pokemon is PokedexEntry => Boolean(pokemon),
  );

export const canGoToPrevious = (id: number) => id > 1;
export const canGoToNext = (id: number) => id < DEX_MAX;

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

/** One form a Pokémon's page can show: the Pokémon itself or one of its varieties. */
export type PokemonForm = PokemonVariety & { label: string };

/** A form's button label: its form name, else "Default Form" or its name. */
export const formatFormName = ({ name, form_name, is_default }: PokemonVariety): string =>
  form_name || (is_default ? TEXT.defaultForm : capitalize(formatSpriteName(name)));

/**
 * Every form of the entry's species, the default form first and the rest in
 * the server's order. Just the entry when the species has one form, or when
 * the server predates varieties.
 */
export const getForms = (entry: PokeboxEntry): PokemonForm[] => {
  const varieties = entry.varieties ?? [];
  const self: PokemonVariety = {
    id: entry.id,
    name: entry.name,
    form_name: entry.form_name ?? "",
    // The entry is the default form unless one of its varieties is.
    is_default: !varieties.some((variety) => variety.is_default),
    species_description: entry.species_description,
    types: entry.types,
    abilities: entry.abilities,
    sprites: entry.sprites,
  };
  return [self, ...varieties]
    .sort((a, b) => Number(b.is_default) - Number(a.is_default))
    .map((form) => ({ ...form, label: formatFormName(form) }));
};

// ---------------------------------------------------------------------------
// Sprites
// ---------------------------------------------------------------------------

/**
 * Flattens PokeAPI's nested sprites object into `{ "<parent>-<key>": url }`,
 * e.g. `other.showdown.front_default` becomes `showdown-front_default`.
 */
export const getSprites = (sprites: object, prefix?: string): Record<string, string> =>
  Object.entries(sprites).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === "string" && value) {
      acc[`${prefix ? `${prefix}-` : ""}${key}`] = value;
    } else if (value && typeof value === "object") {
      Object.assign(acc, getSprites(value, key));
    }
    return acc;
  }, {});

const DEFAULT_SPRITE_KEYS = ["showdown-front_default", "official-artwork-front_default", "front_default"];

export const getDefaultSpriteKey = (spriteList: Record<string, string>): string =>
  DEFAULT_SPRITE_KEYS.find((key) => spriteList[key]) ?? Object.keys(spriteList)[0] ?? "";

/** The shiny version of a sprite key, if that sprite exists (e.g. front_default → front_shiny). */
export const getShinySpriteKey = (
  spriteList: Record<string, string>,
  key: string,
): string | undefined => {
  const shinyKey = key.replace(/_default$/, "_shiny");
  return shinyKey !== key && spriteList[shinyKey] ? shinyKey : undefined;
};

/** The sprite to show in the main image, honouring the shiny toggle when a shiny version exists. */
export const getDisplaySpriteKey = (
  spriteList: Record<string, string>,
  selectedKey: string,
  showShiny: boolean,
): string => (showShiny && getShinySpriteKey(spriteList, selectedKey)) || selectedKey;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<string, { background: string; color: string }> = {
  normal: { background: "#6b7280", color: "#ffffff" },
  fire: { background: "#ef4444", color: "#ffffff" },
  water: { background: "#3b82f6", color: "#ffffff" },
  grass: { background: "#22c55e", color: "#ffffff" },
  electric: { background: "#facc15", color: "#000000" },
  ice: { background: "#22d3ee", color: "#000000" },
  fighting: { background: "#c2410c", color: "#ffffff" },
  poison: { background: "#a855f7", color: "#ffffff" },
  ground: { background: "#d97706", color: "#ffffff" },
  flying: { background: "#38bdf8", color: "#000000" },
  psychic: { background: "#ec4899", color: "#ffffff" },
  bug: { background: "#84cc16", color: "#000000" },
  rock: { background: "#4b5563", color: "#ffffff" },
  ghost: { background: "#7e22ce", color: "#ffffff" },
  dragon: { background: "#4f46e5", color: "#ffffff" },
  dark: { background: "#1f2937", color: "#ffffff" },
  steel: { background: "#64748b", color: "#ffffff" },
  fairy: { background: "#f472b6", color: "#000000" },
};

const DEFAULT_TYPE_COLOR = { background: "#9ca3af", color: "#ffffff" };

export const getTypeColor = (type: string) => TYPE_COLORS[type.toLowerCase()] ?? DEFAULT_TYPE_COLOR;

export const getTypeStyle = (type: string): string => {
  const { background, color } = getTypeColor(type);
  return `background-color: ${background}; color: ${color};`;
};

// ---------------------------------------------------------------------------
// Routing (used by the single-page clients; Remix, SvelteKit and Angular use their own routers)
// ---------------------------------------------------------------------------

export type Route = { page: "home" } | { page: "pokemon"; idOrName: string };

export const parseRoute = (pathname: string): Route => {
  const match = pathname.match(/^\/pokemon\/([^/]+)\/?$/);
  return match ? { page: "pokemon", idOrName: decodeURIComponent(match[1]) } : { page: "home" };
};

export const homePath = (backend: Backend): string => `/${getBackendSearch(backend)}`;

export const pokemonPath = (idOrName: string | number, backend: Backend): string =>
  `/pokemon/${encodeURIComponent(String(idOrName))}${getBackendSearch(backend)}`;

export const routePath = (route: Route, backend: Backend): string =>
  route.page === "pokemon" ? pokemonPath(route.idOrName, backend) : homePath(backend);

export const navigate = (path: string): void => {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo(0, 0);
};
