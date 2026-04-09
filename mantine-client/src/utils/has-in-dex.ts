import { PokeDexEntry } from "../App";

export const hasInDex = (idOrName: string, dex: PokeDexEntry[]): boolean => {
  if (!isNaN(Number(idOrName))) {
    const id = Number(idOrName);
    return dex.some((p) => p.id === id);
  } else {
    return dex.some((p) => p.name === idOrName);
  }
}
