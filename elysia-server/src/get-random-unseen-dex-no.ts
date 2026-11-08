const DEX_MAX = 1025; // inclusive, matching rust-server

/** A random unseen dex number, or undefined once every one has been seen. */
export const getRandomUnseenDexNo = (excluded: number[]): number | undefined => {
  // Only exclusions that actually fall inside the valid range count. This
  // ignores duplicates and out-of-range values, both of which would otherwise
  // inflate the exclusion count and raise a false "no available" error.
  const range = new Set(
    excluded.filter((n) => Number.isFinite(n) && n >= 1 && n <= DEX_MAX)
  );

  // If every value in the range is excluded there is no valid result.
  if (range.size >= DEX_MAX) {
    return undefined;
  }

  // The available ids are [1, DEX_MAX] minus the excluded set. Building
  // this once is O(range size) and gives a guaranteed uniform pick with no
  // risk of the rejection loop spinning.
  const available = Array.from({ length: DEX_MAX }, (_, i) => i + 1).filter(
    (n) => !range.has(n)
  );

  return available[Math.floor(Math.random() * available.length)];
}
