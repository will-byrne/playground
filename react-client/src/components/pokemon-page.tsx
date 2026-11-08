import { useEffect, useState } from "react";
import { type Backend, type FetchErrorKind, type PokeboxEntry, TEXT, fetchPokemon, getFetchErrorKind, homePath, navigate } from "../pokedex.ts";
import { PokemonCard } from "./pokemon-card.tsx";

type State = { status: "loading" } | { status: "loaded"; pokemon: PokeboxEntry } | { status: "error"; kind: FetchErrorKind };

export const PokemonPage = ({ idOrName, backend }: { idOrName: string; backend: Backend }) => {
	const [state, setState] = useState<State>({ status: "loading" });

	useEffect(() => {
		fetchPokemon(backend, idOrName)
			.then((pokemon) => setState({ status: "loaded", pokemon }))
			.catch((err) => {
				console.error("Error fetching Pokémon:", err);
				setState({ status: "error", kind: getFetchErrorKind(err) });
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
						<h1 className="text-4xl font-bold text-base-content mb-4">{TEXT.pokemonErrorTitle(state.kind)}</h1>
						<p className="text-xl text-base-content/70 mb-6">{TEXT.pokemonError(idOrName, backend, state.kind)}</p>
						<button type="button" className="btn btn-primary" onClick={() => navigate(homePath(backend))}>
							{TEXT.backToList}
						</button>
					</div>
				)}
			</div>
		</div>
	);
};
