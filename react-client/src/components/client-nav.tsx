import { CLIENT } from "../client.ts";
import { TEXT, getClientLinks } from "../pokedex.ts";

/** Links to the same page in every other client. */
export const ClientNav = ({ path }: { path: string }) => (
	<nav
		aria-label="Clients"
		className="flex flex-wrap items-center justify-center gap-2 px-4 py-3 bg-base-300 border-b border-base-content/10 text-sm"
	>
		<span className="mr-1 font-semibold text-base-content/70">{TEXT.clientNavLabel}</span>
		{getClientLinks(CLIENT, path).map((link) => (
			<a
				key={link.client}
				href={link.href}
				aria-current={link.current ? "page" : undefined}
				className={`btn btn-sm ${link.current ? "btn-primary" : "btn-outline"}`}
			>
				{link.label}
			</a>
		))}
	</nav>
);
