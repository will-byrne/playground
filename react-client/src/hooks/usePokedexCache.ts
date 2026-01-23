import { useCallback, useState } from 'react';

export type PokedexEntry = {
  id: number;
  name: string;
};

export const usePokedexCache = () => {
  const [dex, setDex] = useState<PokedexEntry[]>([]);

  const addToDex = useCallback((entry: PokedexEntry) => {
    setDex(prev => {
      if (prev.some((p) => p.id === entry.id)) {
        return prev;
      }

      return [...prev, entry].sort((a, b) => a.id - b.id);
    });
  }, []);

  const hasInDex = useCallback((id: number) => dex.some(p => p.id === id), [dex]);

  return { dex, addToDex, hasInDex};
}