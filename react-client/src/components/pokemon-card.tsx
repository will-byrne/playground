import { useState } from "react";
import {
	type Backend,
	type PokeboxEntry,
	TEXT,
	canGoToNext,
	canGoToPrevious,
	formatDescription,
	formatDexNo,
	formatSpriteName,
	getDefaultSpriteKey,
	getDisplaySpriteKey,
	getShinySpriteKey,
	getSprites,
	getTypeColor,
	homePath,
	navigate,
	pokemonPath,
} from "../pokedex.ts";
import { Abilities } from "./ablities.tsx";

export const PokemonCard = ({
	pokeboxEntry: { id, name, species_description, types, abilities, sprites },
	backend,
}: {
	pokeboxEntry: PokeboxEntry;
	backend: Backend;
}) => {
	const spriteList = getSprites(sprites);
	const [selectedSpriteKey, setSelectedSpriteKey] = useState(() => getDefaultSpriteKey(spriteList));
	const [showShiny, setShowShiny] = useState(false);
	const displaySpriteKey = getDisplaySpriteKey(spriteList, selectedSpriteKey, showShiny);
	const hasShiny = Boolean(getShinySpriteKey(spriteList, selectedSpriteKey));

	return (
		<div className="min-h-screen bg-base-200 p-4">
			<div className="container mx-auto max-w-6xl">
				{/* Header */}
				<div className="mb-6 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between">
					<button type="button" className="btn btn-secondary" onClick={() => navigate(homePath(backend))}>
						{TEXT.backToList}
					</button>
					<div className="flex items-center gap-4">
						{canGoToPrevious(id) ? (
							<button
								type="button"
								className="btn btn-outline"
								onClick={() => navigate(pokemonPath(id - 1, backend))}
								aria-label="Previous Pokémon"
							>
								{TEXT.previous}
							</button>
						) : (
							<div className="w-20" />
						)}
						<div>
							<h1 className="text-4xl font-bold text-base-content mb-2 capitalize">{name}</h1>
							<p className="text-xl text-base-content/70">{formatDexNo(id)}</p>
						</div>
						{canGoToNext(id) ? (
							<button
								type="button"
								className="btn btn-outline"
								onClick={() => navigate(pokemonPath(id + 1, backend))}
								aria-label="Next Pokémon"
							>
								{TEXT.next}
							</button>
						) : (
							<div className="w-20" />
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Pokémon Image Card */}
					<div className="card bg-base-100 shadow-xl">
						<div className="card-body items-center text-center">
							<img
								alt={`${name} sprite`}
								src={spriteList[displaySpriteKey]}
								className="max-w-full h-64 object-contain rounded-lg"
							/>
							{hasShiny && (
								<label className="flex items-center gap-2 text-sm cursor-pointer">
									<input
										type="checkbox"
										className="toggle toggle-primary"
										checked={showShiny}
										onChange={(event) => setShowShiny(event.currentTarget.checked)}
									/>
									{TEXT.shiny}
								</label>
							)}
							<div className="flex flex-wrap gap-2 justify-center mt-4">
								{types.map((type) => {
									const { background, color } = getTypeColor(type);
									return (
										<div
											key={type}
											className="badge badge-lg font-semibold capitalize border-0"
											style={{ backgroundColor: background, color }}
										>
											{type}
										</div>
									);
								})}
							</div>
						</div>
					</div>

					{/* Pokémon Details Card */}
					<div className="card bg-base-100 shadow-xl">
						<div className="card-body">
							<h2 className="card-title text-2xl mb-4">{TEXT.description}</h2>
							<p className="text-base text-base-content/80 leading-relaxed">
								{formatDescription(species_description)}
							</p>
						</div>
					</div>
				</div>

				<Abilities abilities={abilities} />

				{/* Sprite Gallery */}
				<div className="mt-6">
					<h2 className="text-3xl font-bold text-base-content mb-4">{TEXT.sprites}</h2>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
						{Object.entries(spriteList).map(([spriteName, url]) => {
							const selected = spriteName === selectedSpriteKey;
							return (
								<button
									type="button"
									key={spriteName}
									className={`card bg-base-100 shadow-md border ${selected ? "border-primary" : "border-transparent"}`}
									onClick={() => setSelectedSpriteKey(spriteName)}
									aria-pressed={selected}
								>
									<div className="card-body p-4 items-center cursor-pointer">
										<img alt={spriteName} src={url} className="w-16 h-16 object-contain" />
										<p
											className={`text-xs text-center mt-2 ${selected ? "text-primary font-semibold" : "text-base-content/60"}`}
										>
											{selected ? TEXT.selected : formatSpriteName(spriteName)}
										</p>
									</div>
								</button>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
};
