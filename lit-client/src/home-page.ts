import { LitElement, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import {
  BACKEND_OPTIONS,
  TEXT,
  type Backend,
  type PokeboxEntry,
  type PokedexEntry,
  type Route,
  capitalize,
  fetchPokedex,
  fetchPokemon,
  fetchRandomNewPokemon,
  formatDexNo,
  getBackend,
  getBackendFromSearch,
  getFeaturedPokemon,
  getLeftToDiscover,
  getLeftToDiscoverDesc,
  homePath,
  navigate,
  parseRoute,
  pokemonPath,
  searchPokedex,
} from './pokedex.js';
import './pokemon-card.js';

/** Follows an in-app link through the shared pushState router. */
const followLink = (event: Event) => {
  event.preventDefault();
  navigate((event.currentTarget as HTMLAnchorElement).getAttribute('href') ?? '/');
};

/**
 * App root: routes between the home page and a Pokémon's detail page.
 * Renders into light DOM so the shared global stylesheet (styles/pokedex.css) applies.
 */
@customElement('home-page')
export class HomePage extends LitElement {
  @state() route: Route = parseRoute(window.location.pathname);

  @state() backend: Backend = getBackendFromSearch(window.location.search);

  @state() pokedex: PokedexEntry[] = [];

  @state() error: string | null = null;

  @state() idOrName = '';

  @state() randomLoading = false;

  @state() detail:
    | { status: 'loading' }
    | { status: 'loaded'; pokemon: PokeboxEntry }
    | { status: 'not-found' } = { status: 'loading' };

  private readonly onPopState = () => this.syncWithLocation();

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('popstate', this.onPopState);
    this.syncWithLocation();
  }

  disconnectedCallback() {
    window.removeEventListener('popstate', this.onPopState);
    super.disconnectedCallback();
  }

  private async syncWithLocation() {
    this.route = parseRoute(window.location.pathname);
    this.backend = getBackendFromSearch(window.location.search);
    this.error = null;

    if (this.route.page === 'pokemon') {
      const { idOrName } = this.route;
      this.detail = { status: 'loading' };
      try {
        const pokemon = await fetchPokemon(this.backend, idOrName);
        this.detail = { status: 'loaded', pokemon };
      } catch (err) {
        console.error('Error fetching Pokémon:', err);
        this.detail = { status: 'not-found' };
      }
      return;
    }

    try {
      this.pokedex = await fetchPokedex(this.backend);
    } catch (err) {
      console.error('Failed to load the Pokédex:', err);
      this.pokedex = [];
      this.error = TEXT.pokedexError(this.backend);
    }
  }

  private onSearchSubmit(event: Event) {
    event.preventDefault();
    if (this.idOrName.trim()) {
      navigate(pokemonPath(this.idOrName.trim(), this.backend));
    }
  }

  private async onRandomNewPokemon() {
    this.randomLoading = true;
    this.error = null;
    try {
      const pokemon = await fetchRandomNewPokemon(this.backend);
      navigate(pokemonPath(pokemon.name, this.backend));
    } catch (err) {
      console.error('Failed to fetch a random new Pokémon:', err);
      this.error = TEXT.randomError;
    } finally {
      this.randomLoading = false;
    }
  }

  render() {
    return this.route.page === 'pokemon'
      ? this.renderDetail(this.route.idOrName)
      : this.renderHome();
  }

  private renderDetail(idOrName: string) {
    if (this.detail.status === 'loaded') {
      return html`<pokemon-card
        .pokemon=${this.detail.pokemon}
        .backend=${this.backend}
      ></pokemon-card>`;
    }

    return html`
      <div class="pd-page">
        <div class="pd-container pd-container--wide">
          ${this.detail.status === 'loading'
            ? html`<p class="pd-loading">${TEXT.loading}</p>`
            : html`
                <div class="pd-center">
                  <h1 class="pd-title pd-title--detail" style="margin-bottom: 1rem">
                    ${TEXT.notFoundTitle}
                  </h1>
                  <p class="pd-subtitle" style="margin-bottom: 1.5rem">
                    ${TEXT.notFound(idOrName)}
                  </p>
                  <button
                    type="button"
                    class="pd-btn pd-btn--primary"
                    @click=${() => navigate(homePath(this.backend))}
                  >
                    ${TEXT.backToList}
                  </button>
                </div>
              `}
        </div>
      </div>
    `;
  }

  private renderHome() {
    const { backend, pokedex } = this;
    const searchResults = searchPokedex(pokedex, this.idOrName);

    return html`
      <div class="pd-page">
        <div class="pd-container">
          <!-- Header -->
          <div class="pd-header">
            <h1 class="pd-title">${TEXT.title}</h1>
            <p class="pd-subtitle">${TEXT.subtitle}</p>
          </div>

          ${this.error
            ? html`<div role="alert" class="pd-alert">${this.error}</div>`
            : nothing}

          <!-- Search Section -->
          <div class="pd-card pd-section">
            <div class="pd-card__body">
              <div class="pd-card__title-row">
                <h2 class="pd-card__title">${TEXT.searchTitle}</h2>
                <label class="pd-field">
                  <span class="pd-label pd-label--tight">${TEXT.backendLabel}</span>
                  <select
                    aria-label=${TEXT.backendLabel}
                    class="pd-select"
                    @change=${(event: Event) =>
                      navigate(
                        homePath(getBackend((event.target as HTMLSelectElement).value)),
                      )}
                  >
                    ${BACKEND_OPTIONS.map(
                      option =>
                        html`<option value=${option.value} ?selected=${option.value === backend}>
                          ${option.label}
                        </option>`,
                    )}
                  </select>
                </label>
              </div>
              <form @submit=${this.onSearchSubmit}>
                <div class="pd-field">
                  <label class="pd-label" for="idOrNameInput">${TEXT.searchLabel}</label>
                  <div class="pd-join">
                    <input
                      id="idOrNameInput"
                      type="text"
                      placeholder=${TEXT.searchPlaceholder}
                      class="pd-input pd-grow"
                      .value=${this.idOrName}
                      @input=${(event: Event) => {
                        this.idOrName = (event.target as HTMLInputElement).value;
                      }}
                    />
                    <button
                      type="submit"
                      class="pd-btn pd-btn--primary"
                      ?disabled=${!this.idOrName.trim()}
                    >
                      ${TEXT.search}
                    </button>
                    <button
                      type="button"
                      class="pd-btn"
                      @click=${this.onRandomNewPokemon}
                      ?disabled=${this.randomLoading}
                    >
                      ${this.randomLoading ? TEXT.loading : TEXT.random}
                    </button>
                  </div>
                </div>
              </form>

              <!-- Search Results -->
              ${searchResults.length > 0
                ? html`
                    <div style="margin-top: 1rem">
                      <h3 class="pd-subheading">${TEXT.searchResults}</h3>
                      <div class="pd-grid pd-grid--tight pd-grid--results">
                        ${searchResults.map(
                          pokemon => html`
                            <a
                              href=${pokemonPath(pokemon.name, backend)}
                              class="pd-btn pd-btn--outline pd-btn--sm pd-btn--start"
                              @click=${followLink}
                            >
                              <span class="pd-mono">${formatDexNo(pokemon.id)}</span>
                              <span class="pd-capitalize">${pokemon.name}</span>
                            </a>
                          `,
                        )}
                      </div>
                    </div>
                  `
                : nothing}
            </div>
          </div>

          <!-- Featured Pokémon -->
          <div class="pd-section">
            <h2 class="pd-heading">${TEXT.featured}</h2>
            <div class="pd-grid pd-grid--featured">
              ${getFeaturedPokemon(pokedex).map(
                pokemon => html`
                  <div class="pd-card pd-card--lg">
                    <div class="pd-card__body pd-card__body--compact pd-card__body--center">
                      <h3 class="pd-card__title pd-card__title--md pd-card__title--center">
                        ${formatDexNo(pokemon.id)}
                      </h3>
                      <p
                        class="pd-capitalize"
                        style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem"
                      >
                        ${pokemon.name}
                      </p>
                      <a
                        href=${pokemonPath(pokemon.name, backend)}
                        class="pd-btn pd-btn--primary pd-btn--sm"
                        @click=${followLink}
                      >
                        ${TEXT.viewDetails}
                      </a>
                    </div>
                  </div>
                `,
              )}
            </div>
          </div>

          <!-- Quick Stats -->
          <div class="pd-card pd-section">
            <div class="pd-card__body pd-card__body--center">
              <h2 class="pd-card__title pd-card__title--center" style="margin-bottom: 1rem">
                ${TEXT.statsTitle}
              </h2>
              <div class="pd-stats">
                <div class="pd-stat">
                  <div class="pd-stat__title">${TEXT.statTotalTitle}</div>
                  <div class="pd-stat__value pd-stat__value--primary">${pokedex.length}</div>
                  <div class="pd-stat__desc">${TEXT.statTotalDesc}</div>
                </div>
                <div class="pd-stat">
                  <div class="pd-stat__title">${TEXT.statLeftTitle}</div>
                  <div class="pd-stat__value pd-stat__value--secondary">
                    ${getLeftToDiscover(pokedex)}
                  </div>
                  <div class="pd-stat__desc">${getLeftToDiscoverDesc(pokedex)}</div>
                </div>
                <div class="pd-stat">
                  <div class="pd-stat__title">${TEXT.statLastUpdatedTitle}</div>
                  <div class="pd-stat__value pd-stat__value--accent">
                    ${TEXT.statLastUpdatedValue}
                  </div>
                  <div class="pd-stat__desc">${TEXT.statLastUpdatedDesc}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Browse Pokédex Pokémon -->
          <div class="pd-card">
            <div class="pd-card__body">
              <h2 class="pd-card__title" style="margin-bottom: 1rem">${TEXT.browseTitle}</h2>
              <div class="pd-field">
                <label class="pd-label" for="dexSelector">${TEXT.browseLabel}</label>
                <select
                  id="dexSelector"
                  class="pd-select pd-select--lg"
                  @change=${(event: Event) => {
                    const { value } = event.target as HTMLSelectElement;
                    if (value) navigate(pokemonPath(value, backend));
                  }}
                >
                  <option value="" disabled selected>${TEXT.browsePlaceholder}</option>
                  ${pokedex.map(
                    pokemon =>
                      html`<option value=${pokemon.name}>
                        ${formatDexNo(pokemon.id)} - ${capitalize(pokemon.name)}
                      </option>`,
                  )}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
