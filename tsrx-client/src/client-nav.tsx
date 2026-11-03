import { CLIENT } from './client.ts'
import { TEXT, getClientLinks } from './pokedex.ts'

/** Links to the same page in every other client. */
export const ClientNav = ({ path }: { path: string }) => (
  <nav aria-label="Clients" className="pd-client-nav">
    <span className="pd-client-nav__label">{TEXT.clientNavLabel}</span>
    {getClientLinks(CLIENT, path).map((link) => (
      <a
        key={link.client}
        href={link.href}
        aria-current={link.current ? 'page' : undefined}
        className={`pd-btn pd-btn--sm ${link.current ? 'pd-btn--primary' : 'pd-btn--outline'}`}
      >
        {link.label}
      </a>
    ))}
  </nav>
)
