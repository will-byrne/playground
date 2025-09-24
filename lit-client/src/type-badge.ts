import { LitElement, html, css } from 'lit';
import { property, customElement } from 'lit/decorators.js';

@customElement('type-badge')
export class TypeBadge extends LitElement {
  @property({ type: String }) type = '';

  static styles = css`
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      margin: 0.2rem;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: bold;
      text-transform: capitalize;
      color: #1a1b26;
    }

    .fire { background: #ed8796; }
    .water { background: #8aadf4; }
    .electric { background: #eed49f; }
    .grass { background: #a6da95; }
    .ice { background: #8bd5ca; }
    .fighting { background: #f5a97f; }
    .poison { background: #f5bde6; }
    .ground { background: #eed49f; }
    .flying { background: #b7bdf8; }
    .psychic { background: #f5bde6; }
    .bug { background: #a6da95; }
    .rock { background: #494d64; color: #cad3f5; }
    .ghost { background: #b7bdf8; }
    .dragon { background: #8aadf4; }
    .dark { background: #363a4f; color: #cad3f5; }
    .steel { background: #8bd5ca; }
    .fairy { background: #f5bde6; }
    .normal { background: #494d64; color: #cad3f5; }
  `;

  render() {
    return html`<span class="badge ${this.type.toLowerCase()}">${this.type}</span>`;
  }
}
