import type { ReactNode } from "react";
import { navigate } from "../pokedex.ts";

/** An anchor that navigates client-side via the shared pushState router. */
export const Link = ({
	to,
	className,
	children,
}: {
	to: string;
	className?: string;
	children: ReactNode;
}) => (
	<a
		href={to}
		className={className}
		onClick={(event) => {
			event.preventDefault();
			navigate(to);
		}}
	>
		{children}
	</a>
);
