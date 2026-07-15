import { Injectable } from '@angular/core';

export interface PokedexEntry {
  id: number;
  name: string;
}

export interface PokemonDetail {
  id: number;
  name: string;
  species_description: string;
  types: string[];
  abilities: Array<{
    name: string;
    flavour_text: string;
    effect: string;
  }>;
  sprites: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class PokemonService {
  private readonly baseUrl = 'http://localhost:3000';

  async getPokedex(): Promise<PokedexEntry[]> {
    const response = await fetch(`${this.baseUrl}/pokedex`);
    if (!response.ok) {
      throw new Error(`error fetching (${this.baseUrl}/pokedex): ${response.statusText}`);
    }

    return response.json() as Promise<PokedexEntry[]>;
  }

  async getPokemon(idOrName: string): Promise<PokemonDetail | null> {
    try {
      const response = await fetch(`${this.baseUrl}/pokemon/${idOrName}`);
      if (!response.ok) {
        return null;
      }

      return (await response.json()) as PokemonDetail;
    } catch (error) {
      console.error('Error fetching Pokemon:', error);
      return null;
    }
  }

  async getRandomNewPokemon(): Promise<PokedexEntry> {
    const response = await fetch(`${this.baseUrl}/pokemon/random-new`);
    if (!response.ok) {
      throw new Error(`error fetching (${this.baseUrl}/pokemon/random-new): ${response.statusText}`);
    }

    return response.json() as Promise<PokedexEntry>;
  }
}
