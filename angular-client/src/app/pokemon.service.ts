import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  type Backend,
  type PokeboxEntry,
  type PokedexEntry,
  getBackendUrl,
  sortPokedex,
} from './pokedex';

@Injectable({ providedIn: 'root' })
export class PokemonService {
  constructor(private readonly http: HttpClient) {}

  async getPokedex(backend: Backend): Promise<PokedexEntry[]> {
    const pokedex = await firstValueFrom(
      this.http.get<PokedexEntry[]>(`${getBackendUrl(backend)}/pokedex`),
    );
    return sortPokedex(pokedex);
  }

  async getPokemon(backend: Backend, idOrName: string): Promise<PokeboxEntry> {
    try {
      return await firstValueFrom(
        this.http.get<PokeboxEntry>(
          `${getBackendUrl(backend)}/pokemon/${encodeURIComponent(idOrName)}`,
        ),
      );
    } catch (error) {
      console.error(`Error fetching Pokemon: ${idOrName}`, error);
      throw new Error(`Error fetching Pokemon: ${idOrName}`);
    }
  }

  async getRandomNewPokemon(backend: Backend): Promise<PokeboxEntry> {
    return firstValueFrom(
      this.http.get<PokeboxEntry>(`${getBackendUrl(backend)}/pokemon/random-new`),
    );
  }
}
