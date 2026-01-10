import "./App.css";
import { useMemo, useState } from "react";
import { Hero, type PokeboxEntry } from "./components/hero";
import { PokemonCard } from "./components/pokemon-card.tsx";
import { typedFetch } from "./utils/typed-fetch.ts";

type PokedexEntry = { id: number; name: string };

function App() {
	const [currentPokemon, setCurrentPokemon] = useState<PokeboxEntry>();
	const [cachedDex, setCachedDex] = useState<PokedexEntry[]>([]);

	const setSortedCachedDex = (dex: PokedexEntry[]) => {
		setCachedDex(dex.sort(({ id: ida }, { id: idb }) => ida - idb));
	};

	useMemo(async () => {
		const unsortedDex = await typedFetch<PokedexEntry[]>(
			"http://localhost:3000/pokedex",
		);
		setSortedCachedDex(unsortedDex);
	}, []);

	const loadSpecificPokemon = async (dexNo: number) => {
		const pokeboxEntry = await typedFetch<PokeboxEntry>(
			`http://localhost:3000/pokemon/${dexNo}`,
		);
		setCurrentPokemon(pokeboxEntry);
		if (!cachedDex.find(({ id }) => id === dexNo)) {
			const { id, name } = pokeboxEntry;
			setSortedCachedDex([...cachedDex, { id, name }]);
		}
	};

	const loadRandomPokemon = async () => {
		const pokeboxEntry = await typedFetch<PokeboxEntry>(
			"http://localhost:3000/pokemon/random-new",
		);
		setCurrentPokemon(pokeboxEntry);
		const { id, name } = pokeboxEntry;
		setSortedCachedDex([...cachedDex, { id, name }]);
	};

	return (
		<>
			<div className="sticky top-0 navbar bg-base-300">
				<div className="ps-4">
					<a
						onClick={() => setCurrentPokemon(undefined)}
						className="text-lg font-bold cursor-pointer"
					>
						Pokemon Viewer
					</a>
				</div>
				<div className="flex grow justify-end px-2">
					<div className="flex items-stretch">
						<a
							className="btn btn-ghost rounded-field"
							onClick={loadRandomPokemon}
						>
							Load Random
						</a>
						{cachedDex && cachedDex.length > 0 && (
							<div className="dropdown dropdown-end">
								<div
									tabIndex={0}
									role="button"
									className="btn btn-ghost rounded-field"
								>
									Cached Pokemon
								</div>
								<ul
									tabIndex={0}
									className="menu dropdown-content bg-base-200 rounded-box z-1 mt-4 w-52 p-2 shadow-sm"
								>
									{cachedDex.map(({ name, id }, i) => (
										<li key={`cached-${i}`}>
											<a onClick={() => loadSpecificPokemon(id)}>{name}</a>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</div>
			</div>
			{!currentPokemon && <Hero loadSpecificPokemon={loadSpecificPokemon} />}
			{currentPokemon && (
				<PokemonCard
					pokeboxEntry={currentPokemon}
					setCurrentPokemon={setCurrentPokemon}
				/>
			)}
		</>
	);
}

export default App;
