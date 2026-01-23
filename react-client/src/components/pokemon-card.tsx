import type { PokemonSprites } from "pokenode-ts";
import { useState } from "react";
import { Abilities } from "./ablities.tsx";
import type { PokeboxEntry } from "./hero.tsx";

const getSprites = (sp: PokemonSprites, k?: string): Record<string, string> => {
	return Object.entries(sp).reduce<Record<string, string>>((acc, [key, value]) => {
		if (typeof value === "string") {
			const newKey = `${k ? `${k}-` : ""}${key}`;
			acc[newKey] = value;
		} else if (value && typeof value === "object") {
			Object.assign(acc, getSprites(value, key));
		}
		return acc;
	}, {});
};

export const PokemonCard = ({
	pokeboxEntry: { id, name, species_description, types, abilities, sprites },
	setCurrentPokemon,
}: {
	pokeboxEntry: PokeboxEntry;
	setCurrentPokemon: (pokemonDeets: PokeboxEntry | undefined) => void;
}) => {
	const [showShiny, setShowShiny] = useState(false);
	const spriteList = getSprites(sprites);
	const officialArtFront =
		spriteList["showdown-front_default"] ??
		spriteList["official-artwork-front_default"];
	const officialShinyArtFront =
		spriteList["showdown-front_shiny"] ??
		spriteList["official-artwork-front_shiny"];

	return (
		<div className="hero bg-base-200 min-h-screen min-w-screen">
			<div className="hero-content flex-col lg:flex-row">
				<div>
					{officialShinyArtFront && (
						<input
							onChange={() => setShowShiny(!showShiny)}
							type="checkbox"
							defaultChecked={false}
							className="toggle"
						/>
					)}
					<img
						alt="official art"
						src={showShiny ? officialShinyArtFront : officialArtFront}
						className="max-w-sm rounded-lg shadow-2xl h-96"
					/>
				</div>
				<div>
					<h1 className="text-5xl font-bold">{`${id}: ${name}`}</h1>
					<div>
						{types.map((type) => (
							<div key={type} className="badge badge-secondary mr-1">
								{type}
							</div>
						))}
					</div>
					<p className="py-6">{species_description.replace(/\r?\n/g, " ")}</p>
					<Abilities abilities={abilities} />
					<div className="carousel rounded-box">
						<div className="carousel-item">
							{Object.entries(spriteList).map(([name, url]) => (
								<img alt={name} className="h-36" key={url} src={url} />
							))}
						</div>
					</div>
					<button
						type="button"
						onClick={() => setCurrentPokemon(undefined)}
						className="btn btn-primary mt-2 block"
					>
						Go Back!
					</button>
				</div>
			</div>
		</div>
	);
};
