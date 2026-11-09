import { LitElement, html } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { getTypeStyle } from './pokedex.js';

/**
 * A Pokémon type pill, coloured with the shared type palette. Renders into
 * light DOM with the shared .pd-badge style (styles/pokedex.css), like the
 * other clients' badges.
 */
@customElement('type-badge')
export class TypeBadge extends LitElement {
  @property({ type: String }) type = '';

  createRenderRoot() {
    return this;
  }

  render() {
    return html`<span class="pd-badge" style=${getTypeStyle(this.type)}>${this.type}</span>`;
  }
}
