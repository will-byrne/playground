import { screen } from '@testing-library/dom';
import '@testing-library/jest-dom';
import '../src/type-badge'; // Import the component so it's registered

describe('<type-badge>', () => {
  it('renders the type text', async () => {
    document.body.innerHTML = `<type-badge type="fire"></type-badge>`;
    const el = screen.getByText('fire');
    expect(el).toBeInTheDocument();
  });

  it('applies correct attribute', () => {
    const badge = document.createElement('type-badge');
    badge.setAttribute('type', 'water');
    document.body.appendChild(badge);

    expect(badge).toHaveAttribute('type', 'water');
  });

  it('updates when property changes', async () => {
    const badge = document.createElement('type-badge') as any;
    document.body.appendChild(badge);

    badge.type = 'grass';
    await badge.updateComplete;

    expect(screen.getByText('grass')).toBeInTheDocument();
  });
});
