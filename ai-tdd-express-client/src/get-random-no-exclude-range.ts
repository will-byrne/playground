const DEX_MAX = 1250;

export const getRandomNoExcludeRange = (excluded: number[], max?: number): number => {
  let rand = null;

  while(rand === null || excluded.includes(rand)){
    rand = Math.floor(Math.random() * (max ?? DEX_MAX - 1) + 1);
  }
  return rand;
}
