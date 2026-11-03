import { useEffect, useState } from "react";
import {
	BACKEND_OPTIONS,
	type Backend,
	type PokedexEntry,
	TEXT,
	capitalize,
	fetchPokedex,
	fetchRandomNewPokemon,
	formatDexNo,
	getBackend,
	getFeaturedPokemon,
	getLeftToDiscover,
	getLeftToDiscoverDesc,
	homePath,
	navigate,
	pokemonPath,
	searchPokedex,
} from "../pokedex.ts";
import { Link } from "./link.tsx";

export const HomePage = ({ backend }: { backend: Backend }) => {
	const [pokedex, setPokedex] = useState<PokedexEntry[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [idOrName, setIdOrName] = useState("");
	const [randomLoading, setRandomLoading] = useState(false);

	useEffect(() => {
		fetchPokedex(backend)
			.then(setPokedex)
			.catch((err) => {
				console.error("Failed to load the Pokédex:", err);
				setError(TEXT.pokedexError(backend));
			});
	}, [backend]);

	const searchResults = searchPokedex(pokedex, idOrName);
	const featuredPokemon = getFeaturedPokemon(pokedex);

	const handleRandomNewPokemon = async () => {
		setRandomLoading(true);
		setError(null);
		try {
			const pokemon = await fetchRandomNewPokemon(backend);
			navigate(pokemonPath(pokemon.name, backend));
		} catch (err) {
			console.error("Failed to fetch a random new Pokémon:", err);
			setError(TEXT.randomError);
		} finally {
			setRandomLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-base-200">
			<div className="container mx-auto px-4 py-8 max-w-4xl">
				{/* Header */}
				<div className="text-center mb-8">
					<h1 className="text-5xl font-bold text-base-content mb-4">{TEXT.title}</h1>
					<p className="text-xl text-base-content/70">{TEXT.subtitle}</p>
				</div>

				{error && (
					<div role="alert" className="alert alert-error mb-8">
						<span>{error}</span>
					</div>
				)}

				{/* Search Section */}
				<div className="card bg-base-100 shadow-xl mb-8">
					<div className="card-body">
						<div className="flex flex-wrap items-center justify-between gap-4 mb-4">
							<h2 className="card-title text-2xl">{TEXT.searchTitle}</h2>
							<label className="flex flex-col w-full sm:w-auto">
								<span className="text-sm mb-1">{TEXT.backendLabel}</span>
								<select
									aria-label={TEXT.backendLabel}
									className="select"
									value={backend}
									onChange={(event) => navigate(homePath(getBackend(event.target.value)))}
								>
									{BACKEND_OPTIONS.map(({ value, label }) => (
										<option key={value} value={value}>
											{label}
										</option>
									))}
								</select>
							</label>
						</div>
						<form
							onSubmit={(event) => {
								event.preventDefault();
								if (idOrName.trim()) navigate(pokemonPath(idOrName.trim(), backend));
							}}
						>
							<div className="flex flex-col">
								<label className="py-2 text-sm" htmlFor="idOrNameInput">
									{TEXT.searchLabel}
								</label>
								<div className="join">
									<input
										id="idOrNameInput"
										type="text"
										placeholder={TEXT.searchPlaceholder}
										className="input join-item flex-1"
										value={idOrName}
										onChange={(e) => setIdOrName(e.currentTarget.value)}
									/>
									<button type="submit" className="btn btn-primary join-item" disabled={!idOrName.trim()}>
										{TEXT.search}
									</button>
									<button
										type="button"
										className="btn btn-secondary join-item"
										onClick={handleRandomNewPokemon}
										disabled={randomLoading}
									>
										{randomLoading ? TEXT.loading : TEXT.random}
									</button>
								</div>
							</div>
						</form>

						{/* Search Results */}
						{searchResults.length > 0 && (
							<div className="mt-4">
								<h3 className="text-lg font-semibold mb-2">{TEXT.searchResults}</h3>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									{searchResults.map((pokemon) => (
										<Link
											key={pokemon.id}
											to={pokemonPath(pokemon.name, backend)}
											className="btn btn-outline btn-sm justify-start"
										>
											<span className="font-mono">{formatDexNo(pokemon.id)}</span>
											<span className="capitalize">{pokemon.name}</span>
										</Link>
									))}
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Featured Pokémon */}
				<div className="mb-8">
					<h2 className="text-3xl font-bold text-base-content mb-6">{TEXT.featured}</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
						{featuredPokemon.map((pokemon) => (
							<div key={pokemon.id} className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
								<div className="card-body p-4 items-center text-center">
									<h3 className="card-title text-lg justify-center">{formatDexNo(pokemon.id)}</h3>
									<p className="text-base font-semibold capitalize mb-2">{pokemon.name}</p>
									<Link to={pokemonPath(pokemon.name, backend)} className="btn btn-primary btn-sm">
										{TEXT.viewDetails}
									</Link>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Quick Stats */}
				<div className="card bg-base-100 shadow-xl mb-8">
					<div className="card-body items-center text-center">
						<h2 className="card-title text-2xl justify-center mb-4">{TEXT.statsTitle}</h2>
						<div className="stats stats-vertical lg:stats-horizontal shadow">
							<div className="stat">
								<div className="stat-title">{TEXT.statTotalTitle}</div>
								<div className="stat-value text-primary">{pokedex.length}</div>
								<div className="stat-desc">{TEXT.statTotalDesc}</div>
							</div>
							<div className="stat">
								<div className="stat-title">{TEXT.statLeftTitle}</div>
								<div className="stat-value text-secondary">{getLeftToDiscover(pokedex)}</div>
								<div className="stat-desc">{getLeftToDiscoverDesc(pokedex)}</div>
							</div>
							<div className="stat">
								<div className="stat-title">{TEXT.statLastUpdatedTitle}</div>
								<div className="stat-value text-accent">{TEXT.statLastUpdatedValue}</div>
								<div className="stat-desc">{TEXT.statLastUpdatedDesc}</div>
							</div>
						</div>
					</div>
				</div>

				{/* Browse Pokédex Pokémon */}
				<div className="card bg-base-100 shadow-xl">
					<div className="card-body">
						<h2 className="card-title text-2xl mb-4">{TEXT.browseTitle}</h2>
						<div className="flex flex-col">
							<label className="py-2 text-sm" htmlFor="dexSelector">
								{TEXT.browseLabel}
							</label>
							<select
								id="dexSelector"
								className="select select-lg ml-4"
								onChange={(e) => {
									if (e.target.value) navigate(pokemonPath(e.target.value, backend));
								}}
								defaultValue=""
							>
								<option value="" disabled>
									{TEXT.browsePlaceholder}
								</option>
								{pokedex.map((pokemon) => (
									<option key={pokemon.id} value={pokemon.name}>
										{formatDexNo(pokemon.id)} - {capitalize(pokemon.name)}
									</option>
								))}
							</select>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
