import { LitElement, html, css } from 'lit';
import { property, customElement, state } from 'lit/decorators.js';
import { PokemonSprites } from 'pokenode-ts';

@customElement('sprite-carousel')
export class SpriteCarousel extends LitElement {
  @property({ type: Object }) sprites!: PokemonSprites;

  @state() private currentIndex = 0;

  private spriteKeys: string[] = [];

  private getSprites(sp: PokemonSprites, k?: string): Record<string, string> {
    const result = Object.entries(sp).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (typeof value === 'string' && value) {
          const newKey = `${k ? `${k}-` : ''}${key}`;
          acc[newKey] = value;
        } else if (value && typeof value === 'object') {
          Object.assign(acc, this.getSprites(value, key));
        }
        return acc;
      },
      {},
    );

    return result;
  }

  connectedCallback() {
    super.connectedCallback();
    this.spriteKeys = Object.entries(this.getSprites(this.sprites) ?? {})
      .filter(([, v]) => typeof v === 'string' && v) // only valid image URLs
      .map(([k]) => k);
  }

  private prevSprite() {
    this.currentIndex =
      (this.currentIndex - 1 + this.spriteKeys.length) % this.spriteKeys.length;
  }

  private nextSprite() {
    this.currentIndex = (this.currentIndex + 1) % this.spriteKeys.length;
  }

  render() {
    if (!this.spriteKeys.length) {
      return html`<p>No sprites available</p>`;
    }
    const key = this.spriteKeys[this.currentIndex];
    const url = this.getSprites(this.sprites)[key];
    return html`
      <div class="carousel">
        <button
          class="prev"
          @click=${this.prevSprite}
          aria-label="Previous sprite"
        >
          ‹
        </button>
        <img src=${url} alt=${key} />
        <button class="next" @click=${this.nextSprite} aria-label="Next sprite">
          ›
        </button>
      </div>
      <p class="label">${key}</p>
    `;
  }

  static styles = css`
    .carousel {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 200px;
      height: 200px; /* fixed height prevents jumpiness */
      margin: 0 auto;
      background: #24273a;
      border-radius: 8px;
    }

    img {
      max-height: 100%;
      max-width: 100%;
      object-fit: contain;
    }

    button {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: #8aadf4;
      border: none;
      border-radius: 50%;
      width: 2rem;
      height: 2rem;
      cursor: pointer;
      font-weight: bold;
      color: #1a1b26;
      transition: background 0.2s ease;
    }

    button:hover {
      background: #b7bdf8;
    }

    .prev {
      left: -2.5rem;
    }

    .next {
      right: -2.5rem;
    }

    .label {
      margin-top: 0.5rem;
      font-size: 0.85rem;
      color: #a5adcb;
      text-align: center;
      text-transform: capitalize;
    }
  `;
}
