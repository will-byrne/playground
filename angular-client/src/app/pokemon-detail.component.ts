import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { PokemonService } from './pokemon.service';
import {
  TEXT,
  type Backend,
  type FetchErrorKind,
  type PokeboxEntry,
  type PokemonForm,
  canGoToNext,
  canGoToPrevious,
  formatDescription,
  formatDexNo,
  formatSpriteName,
  getBackend,
  getDefaultSpriteKey,
  getDisplaySpriteKey,
  getFetchErrorKind,
  getForms,
  getShinySpriteKey,
  getSprites,
  getTypeStyle,
  homePath,
  pokemonPath,
} from './pokedex';

@Component({
  selector: 'app-pokemon-detail',
  standalone: true,
  templateUrl: './pokemon-detail.component.html',
})
export class PokemonDetailComponent implements OnInit {
  readonly text = TEXT;
  readonly formatDexNo = formatDexNo;
  readonly formatDescription = formatDescription;
  readonly formatSpriteName = formatSpriteName;
  readonly getTypeStyle = getTypeStyle;
  readonly canGoToPrevious = canGoToPrevious;
  readonly canGoToNext = canGoToNext;

  backend: Backend = 'elysia';
  idOrName = '';
  status: 'loading' | 'loaded' | 'error' = 'loading';
  errorKind: FetchErrorKind = 'not-found';
  pokemon: PokeboxEntry | null = null;
  /** Every form of the Pokémon's species, and the one being shown. */
  forms: PokemonForm[] = [];
  form: PokemonForm | null = null;
  spriteList: Record<string, string> = {};
  spriteEntries: Array<[string, string]> = [];
  selectedSpriteKey = '';
  showShiny = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly pokemonService: PokemonService,
  ) {}

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(
      async ([params, queryParams]) => {
        this.idOrName = params.get('idOrName') ?? '';
        this.backend = getBackend(queryParams.get('backend'));
        this.status = 'loading';
        try {
          this.setPokemon(await this.pokemonService.getPokemon(this.backend, this.idOrName));
          this.status = 'loaded';
        } catch (error) {
          console.error('Error fetching Pokémon:', error);
          this.pokemon = null;
          this.errorKind = getFetchErrorKind(error);
          this.status = 'error';
        }
      },
    );
  }

  private setPokemon(pokemon: PokeboxEntry): void {
    this.pokemon = pokemon;
    this.forms = getForms(pokemon);
    this.selectForm(pokemon.id);
    this.showShiny = false;
  }

  selectForm(formId: number): void {
    this.form = this.forms.find((f) => f.id === formId) ?? this.forms[0];
    // Each form has its own sprites, so start from its default one.
    this.spriteList = getSprites(this.form.sprites);
    this.spriteEntries = Object.entries(this.spriteList);
    this.selectedSpriteKey = getDefaultSpriteKey(this.spriteList);
  }

  get displaySprite(): string {
    return this.spriteList[getDisplaySpriteKey(this.spriteList, this.selectedSpriteKey, this.showShiny)] ?? '';
  }

  get hasShiny(): boolean {
    return Boolean(getShinySpriteKey(this.spriteList, this.selectedSpriteKey));
  }

  goHome(): void {
    void this.router.navigateByUrl(homePath(this.backend));
  }

  goToPokemon(id: number): void {
    void this.router.navigateByUrl(pokemonPath(id, this.backend));
  }
}
