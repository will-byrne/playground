// Shared Pokédex helpers. This file is copied verbatim into every client
// (angular, lit, mantine, react, remix, svelte, tsrx) so they all show the
// same information in the same way. Keep the copies in sync.

export type PokedexEntry = { id: number; name: string };

export type Ability = { name: string; flavour_text: string; effect: string };

export type PokeboxEntry = {
  id: number;
  name: string;
  species_description: string;
  types: string[];
  abilities: Ability[];
  sprites: object;
};

export const DEX_MAX = 1025;
export const FEATURED_IDS = [37, 77, 151, 647, 700];
export const SEARCH_RESULT_LIMIT = 10;

// ---------------------------------------------------------------------------
// Backends
// ---------------------------------------------------------------------------

export const BACKENDS = {
  elysia: { label: "Elysia", url: "http://localhost:3001" },
  rust: { label: "Rust", url: "http://localhost:3000" },
} as const;

export type Backend = keyof typeof BACKENDS;

export const BACKEND_OPTIONS = (Object.keys(BACKENDS) as Backend[]).map((value) => ({
  value,
  label: BACKENDS[value].label,
}));

export const getBackend = (value: string | null | undefined): Backend =>
  value === "rust" ? "rust" : "elysia";

export const getBackendUrl = (backend: Backend): string => BACKENDS[backend].url;

export const getBackendSearch = (backend: Backend): string =>
  backend === "rust" ? "?backend=rust" : "";

export const getBackendFromSearch = (search: string): Backend =>
  getBackend(new URLSearchParams(search).get("backend"));

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

export const TEXT = {
  title: "Pokédex Explorer",
  subtitle: "Discover and learn about Pokémon",
  searchTitle: "Search Pokémon",
  backendLabel: "Backend",
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
  notFoundTitle: "Pokémon Not Found",
  pokedexError: (backend: Backend) =>
    `Could not load the Pokédex from the ${BACKENDS[backend].label} backend.`,
  randomError: "Could not find a random new Pokémon.",
  notFound: (idOrName: string) => `The Pokémon "${idOrName}" could not be found.`,
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

export const navigate = (path: string): void => {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo(0, 0);
};
