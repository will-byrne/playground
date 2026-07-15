import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PokemonService, PokemonDetail } from './pokemon.service';

@Component({
  selector: 'app-pokemon-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pokemon-detail.component.html',
  styleUrl: './pokemon-detail.component.scss'
})
export class PokemonDetailComponent implements OnInit {
  pokemon: PokemonDetail | null = null;
  showShiny = false;
  idOrName = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly pokemonService: PokemonService
  ) {}

  async ngOnInit(): Promise<void> {
    this.route.paramMap.subscribe(async (params) => {
      this.idOrName = params.get('idOrName') ?? '';
      this.pokemon = await this.pokemonService.getPokemon(this.idOrName);
      this.syncSpritePreference();
    });
  }

  get canGoToPrevious(): boolean {
    return (this.pokemon?.id ?? 0) > 1;
  }

  get canGoToNext(): boolean {
    return (this.pokemon?.id ?? 0) < 1025;
  }

  get spriteList(): Record<string, string> {
    const sprites = this.pokemon?.sprites ?? {};
    const result: Record<string, string> = {};

    const collect = (value: unknown, prefix = ''): void => {
      if (typeof value === 'string' && value) {
        result[prefix] = value;
      } else if (value && typeof value === 'object') {
        Object.entries(value as Record<string, unknown>).forEach(([name, child]) => {
          const next = prefix ? `${prefix}-${name}` : name;
          collect(child, next);
        });
      }
    };

    collect(sprites);
    return result;
  }

  getSpriteEntries(): Array<{ key: string; value: string }> {
    return Object.entries(this.spriteList).map(([key, value]) => ({ key, value }));
  }

  normalizeDescription(): string {
    return this.pokemon?.species_description.replace(/\r?\n/g, ' ') ?? '';
  }

  formatSpriteName(name: string): string {
    return name.replace(/-/g, ' ').replace(/_/g, ' ');
  }

  get hasShinySprite(): boolean {
    return Boolean(this.officialArtShiny);
  }

  get displaySprite(): string | null {
    if (this.showShiny && this.officialArtShiny) {
      return this.officialArtShiny;
    }

    return this.officialArtFront;
  }

  get officialArtFront(): string | null {
    return this.getSpriteValue(
      'other-official-artwork-front_default',
      'official-artwork-front_default',
      'showdown-front_default',
      'other-home-front_default',
      'other-showdown-front_default',
      'front_default'
    );
  }

  get officialArtShiny(): string | null {
    return this.getSpriteValue(
      'other-home-front_shiny',
      'other-showdown-front_shiny',
      'showdown-front_shiny',
      'official-artwork-front_shiny',
      'other-official-artwork-front_shiny',
      'front_shiny'
    );
  }

  private syncSpritePreference(): void {
    const hasRegular = Boolean(this.officialArtFront);
    const hasShiny = Boolean(this.officialArtShiny);

    if (hasShiny && !hasRegular) {
      this.showShiny = true;
    } else if (!hasShiny) {
      this.showShiny = false;
    }
  }

  private getSpriteValue(...candidates: string[]): string | null {
    for (const candidate of candidates) {
      const value = this.spriteList[candidate];
      if (value) {
        return value;
      }
    }

    return null;
  }

  getTypeColor(type: string): string {
    const typeColors: Record<string, string> = {
      normal: 'bg-gray-500 text-white',
      fire: 'bg-red-500 text-white',
      water: 'bg-blue-500 text-white',
      grass: 'bg-green-500 text-white',
      electric: 'bg-yellow-400 text-black',
      ice: 'bg-cyan-400 text-black',
      fighting: 'bg-orange-700 text-white',
      poison: 'bg-purple-500 text-white',
      ground: 'bg-amber-600 text-white',
      flying: 'bg-sky-400 text-black',
      psychic: 'bg-pink-500 text-white',
      bug: 'bg-lime-500 text-black',
      rock: 'bg-gray-600 text-white',
      ghost: 'bg-purple-700 text-white',
      dragon: 'bg-indigo-600 text-white',
      dark: 'bg-gray-800 text-white',
      steel: 'bg-slate-500 text-white',
      fairy: 'bg-pink-400 text-black'
    };

    return typeColors[type.toLowerCase()] ?? 'bg-gray-400 text-white';
  }

  navigateToPrevious(): void {
    if (this.canGoToPrevious && this.pokemon) {
      void this.router.navigate(['/pokemon', this.pokemon.id - 1]);
    }
  }

  navigateToNext(): void {
    if (this.canGoToNext && this.pokemon) {
      void this.router.navigate(['/pokemon', this.pokemon.id + 1]);
    }
  }
}
