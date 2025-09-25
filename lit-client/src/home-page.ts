import { LitElement, html, css } from 'lit';
import { property, customElement, state } from 'lit/decorators.js';
import { PokemonSprites } from 'pokenode-ts';
import { typedFetch } from './utils/typed-fetch.js';
import './pokemon-card.js';

export type PokeboxEntry = {
  id: number,
  name: string,
  species_description: string,
  types: string[],
  abilities: {
    name: string,
    flavour_text: string,
    effect: string,
  }[],
  sprites: PokemonSprites,
};

type PokedexEntry = { id: number, name: string };

@customElement('home-page')
export class HomePage extends LitElement {
  @property({ type: String }) header = 'Pokémon Search';
  
  @state() dexNo: number = 1;
  
  @state() loadedPokemon: PokeboxEntry | undefined = undefined;
  
  @state() loading = false;
  
  @state() error: string | null = null;
  
  @state() pokedex: PokedexEntry[] = [];
  
  @state() selectedDexId: number | null = null;

  private async getDex() {
    try {
      this.pokedex = await typedFetch<PokedexEntry[]>('http://localhost:3000/pokedex');
    } catch (err) {
      console.error('Failed to load pokedex', err);
    }
  }

  async firstUpdated() {
    await this.getDex();
  }

  private onSelectChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    this.selectedDexId = parseInt(target.value, 10);
    if (!Number.isNaN(this.selectedDexId)) {
      this.dexNo = this.selectedDexId;
      this.getPokemon();
    }
  }

  private onDexInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const parsed = parseInt(target.value, 10);
    this.dexNo = Number.isNaN(parsed) ? this.dexNo : parsed;
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') this.getPokemon();
  }

  async getPokemon() {
    if (!this.dexNo) return;
    this.loading = true;
    this.error = null;
    try {
      this.loadedPokemon = await typedFetch<PokeboxEntry>(
        `http://localhost:3000/pokemon/${this.dexNo}`
      );
      if (!this.pokedex.includes({ id: this.loadedPokemon.id, name: this.loadedPokemon.name})) {
        this.getDex();
      }
      await this.getDex();
    } catch (err) {
      console.error(err);
      this.error = 'Failed to load Pokémon';
    } finally {
      this.loading = false;
    }
  }

  static styles = css`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap');

    :host {
      /* --- Theme variables --- */
      --ctp-base: #24273a;
      --ctp-surface0: #363a4f;
      --ctp-surface1: #494d64;
      --ctp-text: #cad3f5;
      --ctp-subtext: #a5adcb;
      --ctp-lavender: #b7bdf8;
      --ctp-blue: #8aadf4;
      --ctp-red: #ed8796;

      --select-arrow: url('data:image/svg+xml;utf8,<svg fill="%23cad3f5" height="10" viewBox="0 0 24 24" width="10" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>');

      display: flex;
      flex-direction: column;
      align-items: center;
      background: var(--ctp-base);
      color: var(--ctp-text);
      min-height: 100vh;
      font-family: 'Noto Sans', sans-serif;
      text-align: center;
      padding: 1rem;
    }

    h1 { color: var(--ctp-lavender); }

    /* --- Controls container --- */
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: center;
      margin-bottom: 1rem;
    }

    /* --- Shared form controls --- */
    input, select, button {
      font-family: inherit;
      font-size: 1rem;
      line-height: 1.5;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      box-sizing: border-box;
      height: 2.5rem;  /* normalize height for alignment */
    }

    input, select {
      background: var(--ctp-surface0);
      border: 1px solid var(--ctp-surface1);
      color: var(--ctp-text);
      cursor: pointer;
    }

    input::placeholder { color: var(--ctp-subtext); }

    /* --- Button styling --- */
    button {
      background: var(--ctp-blue);
      color: #1a1b26;
      border: 1px solid var(--ctp-surface1);
      cursor: pointer;
      transition: background 0.2s ease;
    }

    button:hover {
      background: var(--ctp-lavender);
      color: var(--ctp-text);
    }

    /* --- Select styling --- */
    select {
      background: var(--ctp-surface0) var(--select-arrow) no-repeat right 0.75rem center;
      background-size: 0.65rem;
      padding-right: 2rem; /* space for arrow */
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      display: inline-flex;
      align-items: center;
    }

    /* --- Hover & Focus for inputs, select, button --- */
    input:hover,
    input:focus,
    select:hover,
    select:focus,
    button:focus {
      outline: none;
      border-color: var(--ctp-blue);
      box-shadow: 0 0 0 2px rgba(138, 173, 244, 0.3);
    }

    select:hover { background-color: var(--ctp-blue); color: #1a1b26; }

    /* --- Status messages --- */
    .status { margin-top: 0.5rem; font-size: 0.9rem; color: var(--ctp-subtext); }
    .error { color: var(--ctp-red); }
  `;

  render() {
    return html`
      <main>
        <h1>${this.header}</h1>
        <input
          type="number"
          max="1025"
          min="1"
          placeholder="1"
          .value=${String(this.dexNo)}
          @input=${this.onDexInput}
          @keydown=${this.onKeyDown}
        />
        <button @click=${this.getPokemon}>Search!</button>

        <select @change=${this.onSelectChange}>
          <option value="" disabled selected>Select Pokémon</option>
          ${this.pokedex.map(p =>
            html`<option value=${p.id}>#${p.id} ${p.name}</option>`
          )}
        </select>

        ${this.loading ? html`<div class="status">Loading...</div>` : ''}
        ${this.error ? html`<div class="status error">${this.error}</div>` : ''}
        ${this.loadedPokemon ? html`<pokemon-card .pokemon=${this.loadedPokemon}></pokemon-card>` : ''}
      </main>
    `;
  }
}
