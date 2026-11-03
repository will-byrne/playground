import { LitElement, html, css } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { getTypeStyle } from './pokedex.js';

/** A Pokémon type pill, coloured with the shared type palette (matches .pd-badge). */
@customElement('type-badge')
export class TypeBadge extends LitElement {
  @property({ type: String }) type = '';

  static styles = css`
    .badge {
      display: inline-flex;
      align-items: center;
      height: 1.75rem;
      padding: 0 0.75rem;
      border-radius: 0.25rem;
      font-family: inherit;
      font-size: 1rem;
      font-weight: 600;
      text-transform: capitalize;
    }
  `;

  render() {
    return html`<span class="badge ${this.type.toLowerCase()}" style=${getTypeStyle(this.type)}
      >${this.type}</span
    >`;
  }
}
