/** Longest id or name `/pokemon/:idOrName` accepts. Real names top out around 25 characters. */
export const MAX_IDENTIFIER_LEN = 64;

/**
 * `idOrName` lowercased, if it can name a Pokémon: 1 to MAX_IDENTIFIER_LEN
 * of a-z, 0-9 and `-`; otherwise undefined. Anything else can't exist, so
 * it's answered 404 without asking PokeAPI (which rejects odd names with a
 * 403 that would otherwise surface as a 502). Same rule as rust-server.
 */
export const normalizeIdentifier = (idOrName: string): string | undefined => {
  const key = idOrName.trim().toLowerCase();
  return key.length <= MAX_IDENTIFIER_LEN && /^[a-z0-9-]+$/.test(key) ? key : undefined;
};
