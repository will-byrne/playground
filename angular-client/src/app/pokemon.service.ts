import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

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

  constructor(private readonly http: HttpClient) {}

  async getPokedex(): Promise<PokedexEntry[]> {
    return firstValueFrom(this.http.get<PokedexEntry[]>(`${this.baseUrl}/pokedex`));
  }

  async getPokemon(idOrName: string): Promise<PokemonDetail | null> {
    try {
      return await firstValueFrom(
        this.http.get<PokemonDetail>(`${this.baseUrl}/pokemon/${idOrName}`)
      );
    } catch (error) {
      console.error(`Error fetching Pokemon: ${idOrName}`, error);
      throw new Error(`Error fetching Pokemon: ${idOrName}`);
    }
  }

  async getRandomNewPokemon(): Promise<PokedexEntry> {
    return firstValueFrom(this.http.get<PokedexEntry>(`${this.baseUrl}/pokemon/random-new`));
  }
}
