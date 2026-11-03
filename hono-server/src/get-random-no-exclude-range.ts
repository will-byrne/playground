const DEX_MAX = 1025; // inclusive, matching rust-server

export const getRandomNoExcludeRange = (excluded: number[], max?: number): number => {
  let rand = null;

  while(rand === null || excluded.includes(rand)){
    rand = Math.floor(Math.random() * (max ?? DEX_MAX) + 1);
  }
  return rand;
}
