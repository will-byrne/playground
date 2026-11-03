import { useEffect, useState } from "react";
import { type Backend, type PokeboxEntry, TEXT, fetchPokemon, homePath, navigate } from "../pokedex.ts";
import { PokemonCard } from "./pokemon-card.tsx";

type State = { status: "loading" } | { status: "loaded"; pokemon: PokeboxEntry } | { status: "not-found" };

export const PokemonPage = ({ idOrName, backend }: { idOrName: string; backend: Backend }) => {
	const [state, setState] = useState<State>({ status: "loading" });

	useEffect(() => {
		fetchPokemon(backend, idOrName)
			.then((pokemon) => setState({ status: "loaded", pokemon }))
			.catch((err) => {
				console.error("Error fetching Pokémon:", err);
				setState({ status: "not-found" });
			});
	}, [backend, idOrName]);

	if (state.status === "loaded") {
		return <PokemonCard pokeboxEntry={state.pokemon} backend={backend} />;
	}

	return (
		<div className="min-h-screen bg-base-200 p-4">
			<div className="container mx-auto max-w-6xl">
				{state.status === "loading" ? (
					<p className="py-16 text-center text-base-content/70">{TEXT.loading}</p>
				) : (
					<div className="text-center">
						<h1 className="text-4xl font-bold text-base-content mb-4">{TEXT.notFoundTitle}</h1>
						<p className="text-xl text-base-content/70 mb-6">{TEXT.notFound(idOrName)}</p>
						<button type="button" className="btn btn-primary" onClick={() => navigate(homePath(backend))}>
							{TEXT.backToList}
						</button>
					</div>
				)}
			</div>
		</div>
	);
};
