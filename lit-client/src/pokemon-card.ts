import { LitElement, html, css } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import './type-badge.js';
import { PokeboxEntry } from './home-page.js';
import './sprite-carousel.js';

@customElement('pokemon-card')
export class PokemonCard extends LitElement {
  @property({ type: Object }) pokemon!: PokeboxEntry;

  static styles = css`
    .card {
      margin-top: 1.5rem;
      padding: 1rem;
      border-radius: 12px;
      background: #363a4f;
      box-shadow: 0 4px 10px rgba(0,0,0,0.4);
      text-align: left;
      font-family: 'Noto Sans', sans-serif;
    }

    header h2 {
      margin: 0;
      font-size: 1.5rem;
      color: #eed49f;
    }

    .dex-no {
      font-size: 0.9rem;
      color: #a5adcb;
    }

    .content {
      display: flex;
      flex-direction: column; /* stack vertically */
      align-items: center;    /* center the sprite horizontally */
      gap: 1rem;
      margin-top: 1rem;
    }

    .sprite {
      text-align: center;
    }

    .sprite img {
      max-width: 100%;
    }

    .details {
      width: 100%;
    }

    .types {
      margin-bottom: 0.5rem;
    }

    .description {
      margin: 0.5rem 0;
    }

    .abilities li {
      margin-bottom: 0.5rem;
    }
  `;

  render() {
    const p = this.pokemon;
    return html`
      <section class="card">
        <header>
          <h2>${p.name} <span class="dex-no">#${p.id}</span></h2>
        </header>
        <div class="content">
          <div class="sprite">
            <sprite-carousel .sprites=${p.sprites}></sprite-carousel>
          </div>
          <div class="details">
            <div class="types">
              ${p.types.map(t => html`<type-badge .type=${t}></type-badge>`)}
            </div>
            <p class="description">${p.species_description}</p>
            <ul class="abilities">
              ${p.abilities.map(a => html`
                <li>
                  <strong>${a.name}</strong>
                  <p class="flavor">${a.flavour_text}</p>
                  <small>${a.effect}</small>
                </li>
              `)}
            </ul>
          </div>
        </div>
      </section>
    `;
  }
}
