import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PokemonService } from './pokemon.service';
import {
  BACKEND_OPTIONS,
  TEXT,
  type Backend,
  type PokedexEntry,
  capitalize,
  formatDexNo,
  getBackend,
  getFeaturedPokemon,
  getLeftToDiscover,
  getLeftToDiscoverDesc,
  homePath,
  pokemonPath,
  searchPokedex,
} from './pokedex';

@Component({
  selector: 'app-pokemon-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './pokemon-list.component.html',
})
export class PokemonListComponent implements OnInit {
  readonly text = TEXT;
  readonly backendOptions = BACKEND_OPTIONS;
  readonly formatDexNo = formatDexNo;
  readonly capitalize = capitalize;

  backend: Backend = 'elysia';
  pokedex: PokedexEntry[] = [];
  idOrName = '';
  randomLoading = false;
  error: string | null = null;

  constructor(
    private readonly pokemonService: PokemonService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(async (params) => {
      this.backend = getBackend(params.get('backend'));
      this.error = null;
      try {
        this.pokedex = await this.pokemonService.getPokedex(this.backend);
      } catch (error) {
        console.error('Failed to load the Pokédex:', error);
        this.pokedex = [];
        this.error = TEXT.pokedexError(this.backend);
      }
    });
  }

  /** Query params that keep the selected backend when following a routerLink. */
  get backendQuery(): Record<string, string> {
    return this.backend === 'rust' ? { backend: 'rust' } : {};
  }

  get searchResults(): PokedexEntry[] {
    return searchPokedex(this.pokedex, this.idOrName);
  }

  get featuredPokemon(): PokedexEntry[] {
    return getFeaturedPokemon(this.pokedex);
  }

  get leftToDiscover(): number {
    return getLeftToDiscover(this.pokedex);
  }

  get leftToDiscoverDesc(): string {
    return getLeftToDiscoverDesc(this.pokedex);
  }

  onBackendChange(value: string): void {
    void this.router.navigateByUrl(homePath(getBackend(value)));
  }

  onSearchSubmit(event: Event): void {
    event.preventDefault();
    if (this.idOrName.trim()) {
      void this.router.navigateByUrl(pokemonPath(this.idOrName.trim(), this.backend));
    }
  }

  async onRandomNewPokemon(): Promise<void> {
    this.randomLoading = true;
    this.error = null;
    try {
      const pokemon = await this.pokemonService.getRandomNewPokemon(this.backend);
      void this.router.navigateByUrl(pokemonPath(pokemon.name, this.backend));
    } catch (error) {
      console.error('Failed to fetch a random new Pokémon:', error);
      this.error = TEXT.randomError;
    } finally {
      this.randomLoading = false;
    }
  }

  onPokedexSelect(value: string): void {
    if (value) {
      void this.router.navigateByUrl(pokemonPath(value, this.backend));
    }
  }
}
