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

  /**
   * Rejects with the HttpErrorResponse on failure, so callers can tell a
   * missing Pokémon (404) from a backend failure via getFetchErrorKind.
   */
  async getPokemon(backend: Backend, idOrName: string): Promise<PokeboxEntry> {
    return firstValueFrom(
      this.http.get<PokeboxEntry>(
        `${getBackendUrl(backend)}/pokemon/${encodeURIComponent(idOrName)}`,
      ),
    );
  }

  async getRandomNewPokemon(backend: Backend): Promise<PokeboxEntry> {
    return firstValueFrom(
      this.http.get<PokeboxEntry>(`${getBackendUrl(backend)}/pokemon/random-new`),
    );
  }
}
