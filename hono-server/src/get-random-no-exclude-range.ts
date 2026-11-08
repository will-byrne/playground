const DEX_MAX = 1025; // inclusive, matching rust-server

/**
 * A random number in 1..=max (default 1025) that isn't excluded, or
 * undefined once every number is excluded.
 */
export const getRandomNoExcludeRange = (excluded: number[], max = DEX_MAX): number | undefined => {
  const excludedSet = new Set(excluded);
  const available: number[] = [];
  for (let n = 1; n <= max; n++) {
    if (!excludedSet.has(n)) available.push(n);
  }
  return available.length === 0 ? undefined : available[Math.floor(Math.random() * available.length)];
};
