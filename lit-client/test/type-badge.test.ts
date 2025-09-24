import { html } from 'lit';
import { fixture, expect } from '@open-wc/testing';

import type { TypeBadge } from '../src/type-badge.js';
import '../src/type-badge.js';

describe('LitClient', () => {
  let element: TypeBadge;
  beforeEach(async () => {
    element = await fixture(html`<type-badge></type-badge>`);
  });

  it('renders a span', async () => {
    const fairyBadge = await fixture(html`<type-badge type="fairy"></type-badge>`)
    const span = fairyBadge.shadowRoot!.querySelector('span')!;
    expect(span).to.exist;
    expect(span.textContent).to.equal('fairy');
    expect(span.classList[0]).to.equal('badge');
    expect(span.classList[1]).to.equal('fairy');
  });

  it('passes the a11y audit', async () => {
    await expect(element).shadowDom.to.be.accessible();
  });
});
