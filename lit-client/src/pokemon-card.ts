import { LitElement, PropertyValues, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  TEXT,
  type Backend,
  type PokeboxEntry,
  type PokemonForm,
  canGoToNext,
  canGoToPrevious,
  formatDescription,
  formatDexNo,
  formatSpriteName,
  getDefaultSpriteKey,
  getDisplaySpriteKey,
  getForms,
  getShinySpriteKey,
  getSprites,
  homePath,
  navigate,
  pokemonPath,
} from './pokedex.js';
import './type-badge.js';

/**
 * A Pokémon's detail page. Renders into light DOM so the shared global
 * stylesheet (styles/pokedex.css) applies.
 */
@customElement('pokemon-card')
export class PokemonCard extends LitElement {
  @property({ type: Object }) pokemon!: PokeboxEntry;

  @property({ type: String }) backend: Backend = 'elysia';

  @state() private selectedFormId = 0;

  @state() private selectedSpriteKey = '';

  @state() private showShiny = false;

  private forms: PokemonForm[] = [];

  private spriteList: Record<string, string> = {};

  createRenderRoot() {
    return this;
  }

  willUpdate(changed: PropertyValues<this>) {
    if (changed.has('pokemon') && this.pokemon) {
      // Reset form and sprite selection whenever a different Pokémon is shown.
      this.forms = getForms(this.pokemon);
      this.selectForm(this.pokemon.id);
      this.showShiny = false;
    }
  }

  private get form(): PokemonForm | undefined {
    return this.forms.find(f => f.id === this.selectedFormId) ?? this.forms[0];
  }

  private selectForm(formId: number) {
    this.selectedFormId = formId;
    // Each form has its own sprites, so start from its default one.
    this.spriteList = getSprites(this.form?.sprites ?? {});
    this.selectedSpriteKey = getDefaultSpriteKey(this.spriteList);
  }

  render() {
    const { pokemon, form: p, forms, backend, spriteList, selectedSpriteKey } = this;
    if (!pokemon || !p) return nothing;
    const displaySpriteKey = getDisplaySpriteKey(spriteList, selectedSpriteKey, this.showShiny);
    const hasShiny = Boolean(getShinySpriteKey(spriteList, selectedSpriteKey));

    return html`
      <div class="pd-page">
        <div class="pd-container pd-container--wide">
          <!-- Header -->
          <div class="pd-detail-header">
            <button type="button" class="pd-btn" @click=${() => navigate(homePath(backend))}>
              ${TEXT.backToList}
            </button>
            <div class="pd-detail-nav">
              ${canGoToPrevious(pokemon.id)
                ? html`<button
                    type="button"
                    class="pd-btn pd-btn--outline"
                    aria-label="Previous Pokémon"
                    @click=${() => navigate(pokemonPath(pokemon.id - 1, backend))}
                  >
                    ${TEXT.previous}
                  </button>`
                : html`<div class="pd-spacer"></div>`}
              <div>
                <h1 class="pd-title pd-title--detail pd-capitalize">${pokemon.name}</h1>
                <p class="pd-subtitle">${formatDexNo(pokemon.id)}</p>
              </div>
              ${canGoToNext(pokemon.id)
                ? html`<button
                    type="button"
                    class="pd-btn pd-btn--outline"
                    aria-label="Next Pokémon"
                    @click=${() => navigate(pokemonPath(pokemon.id + 1, backend))}
                  >
                    ${TEXT.next}
                  </button>`
                : html`<div class="pd-spacer"></div>`}
            </div>
          </div>

          ${forms.length > 1
            ? html`<div class="pd-forms">
                <h2 class="pd-forms__label">${TEXT.forms}</h2>
                <div class="pd-forms__list">
                  ${forms.map(f => {
                    const selected = f.id === p.id;
                    return html`<button
                      type="button"
                      class="pd-btn pd-btn--sm ${selected ? 'pd-btn--primary' : 'pd-btn--outline'}"
                      aria-pressed=${selected ? 'true' : 'false'}
                      @click=${() => this.selectForm(f.id)}
                    >
                      ${f.label}
                    </button>`;
                  })}
                </div>
              </div>`
            : nothing}

          <div class="pd-grid pd-grid--detail">
            <!-- Pokémon Image Card -->
            <div class="pd-card">
              <div class="pd-card__body pd-card__body--center">
                <img
                  alt="${p.name} sprite"
                  src=${spriteList[displaySpriteKey] ?? ''}
                  class="pd-main-sprite"
                />
                ${hasShiny
                  ? html`<label class="pd-toggle-label">
                      <input
                        type="checkbox"
                        class="pd-toggle"
                        .checked=${this.showShiny}
                        @change=${(event: Event) => {
                          this.showShiny = (event.target as HTMLInputElement).checked;
                        }}
                      />
                      ${TEXT.shiny}
                    </label>`
                  : nothing}
                <div class="pd-badges">
                  ${p.types.map(type => html`<type-badge .type=${type}></type-badge>`)}
                </div>
              </div>
            </div>

            <!-- Pokémon Details Card -->
            <div class="pd-card">
              <div class="pd-card__body">
                <h2 class="pd-card__title" style="margin-bottom: 1rem">${TEXT.description}</h2>
                <p class="pd-description">${formatDescription(p.species_description)}</p>
              </div>
            </div>
          </div>

          <!-- Abilities Section -->
          <div class="pd-section--detail">
            <h2 class="pd-heading pd-heading--detail">${TEXT.abilities}</h2>
            <div class="pd-grid pd-grid--abilities">
              ${p.abilities.map(
                ability => html`
                  <div class="pd-card pd-card--lg">
                    <div class="pd-card__body">
                      <h3 class="pd-card__title pd-card__title--ability">${ability.name}</h3>
                      <p class="pd-ability-flavour">${ability.flavour_text}</p>
                      <p class="pd-ability-effect">${ability.effect}</p>
                    </div>
                  </div>
                `,
              )}
            </div>
          </div>

          <!-- Sprite Gallery -->
          <div class="pd-section--detail">
            <h2 class="pd-heading pd-heading--detail">${TEXT.sprites}</h2>
            <div class="pd-grid pd-grid--sprites">
              ${Object.entries(spriteList).map(([name, url]) => {
                const selected = name === selectedSpriteKey;
                return html`
                  <button
                    type="button"
                    class="pd-card pd-card--md pd-sprite-card ${selected
                      ? 'pd-sprite-card--selected'
                      : ''}"
                    aria-pressed=${selected ? 'true' : 'false'}
                    @click=${() => {
                      this.selectedSpriteKey = name;
                    }}
                  >
                    <div class="pd-card__body pd-card__body--compact pd-card__body--center">
                      <img alt=${name} src=${url} />
                      <p class="pd-sprite-label ${selected ? 'pd-sprite-label--selected' : ''}">
                        ${selected ? TEXT.selected : formatSpriteName(name)}
                      </p>
                    </div>
                  </button>
                `;
              })}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
