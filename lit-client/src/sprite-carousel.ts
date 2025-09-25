import { LitElement, html, css } from 'lit';
import { property, customElement, state } from 'lit/decorators.js';
import { PokemonSprites } from 'pokenode-ts';

@customElement('sprite-carousel')
export class SpriteCarousel extends LitElement {
  @property({ type: Object }) sprites!: PokemonSprites;
  
  @state() private currentIndex = 0;

  private spriteKeys: string[] = [];

  private flattenSprites(sp: PokemonSprites, k?: string): Record<string, string> {
    return Object.entries(sp).reduce((prev, current) => {
      if (typeof current[1] === 'string') {
        const toReturn: Record<string, string> = { ...prev };
        const newKey = `${k ? `${k}-` : ''}${current[0]}`;
        toReturn[newKey] = (current[1] as string);
        return toReturn;
      } else if (current[1] != null && typeof current[1] === 'object') {
        return { ...prev, ...this.flattenSprites(current[1], current[0]) };
      }
      return prev;
    }, {});
  }

  connectedCallback() {
    super.connectedCallback();
    this.spriteKeys = Object.entries(this.flattenSprites(this.sprites) ?? {})
      .filter(([_, v]) => typeof v === 'string' && v) // only valid image URLs
      .map(([k]) => k);
  }

  private prevSprite() {
    this.currentIndex =
      (this.currentIndex - 1 + this.spriteKeys.length) % this.spriteKeys.length;
  }

  private nextSprite() {
    this.currentIndex =
      (this.currentIndex + 1) % this.spriteKeys.length;
  }

  render() {
    if (!this.spriteKeys.length) {
      return html`<p>No sprites available</p>`;
    }
    const key = this.spriteKeys[this.currentIndex];
    const url = this.flattenSprites(this.sprites)[key];
    return html`
      <div class="carousel">
        <button class="prev" @click=${this.prevSprite} aria-label="Previous sprite">‹</button>
        <img src=${url} alt=${key} />
        <button class="next" @click=${this.nextSprite} aria-label="Next sprite">›</button>
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
