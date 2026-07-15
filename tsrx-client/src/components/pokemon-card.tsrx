import type { PokemonSprites } from "pokenode-ts";
import { useState } from "react";
import { Abilities } from "./ablities.tsrx";
import type { PokeboxEntry } from "./hero.tsrx";

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
}) => @{
	const [showShiny, setShowShiny] = useState(false);
	const spriteList = getSprites(sprites);
	const officialArtFront =
		spriteList["showdown-front_default"] ??
		spriteList["official-artwork-front_default"];
	const officialShinyArtFront =
		spriteList["showdown-front_shiny"] ??
		spriteList["official-artwork-front_shiny"];
	const normalizedSpeciesDescription = species_description.replace(/\r?\n/g, " ");

	<div className="pokemon-card">
		<div className="pokemon-card__content">
			<div className="pokemon-card__image-wrap">
				{officialShinyArtFront && (
					<label className="pokemon-card__toggle">
						<input
							onChange={() => setShowShiny(!showShiny)}
							type="checkbox"
							defaultChecked={false}
						/>
						Show shiny
					</label>
				)}
				<img
					alt="official art"
					src={showShiny ? officialShinyArtFront : officialArtFront}
					className="pokemon-card__art"
				/>
			</div>
			<div className="pokemon-card__details">
				<h1 className="pokemon-card__title">{`${id}: ${name}`}</h1>
				<div className="pokemon-card__types">
					{types.map((type) => (
						<div key={type} className="type-pill">
							{type}
						</div>
					))}
				</div>
				<p className="pokemon-card__description">{normalizedSpeciesDescription}</p>
				<Abilities abilities={abilities} />
				<div className="pokemon-card__sprites">
					<div className="pokemon-card__sprite-grid">
						{Object.entries(spriteList).map(([name, url]) => (
							<img alt={name} className="" key={url} src={url} />
						))}
					</div>
				</div>
				<button
					type="button"
					onClick={() => setCurrentPokemon(undefined)}
					className="secondary-button"
				>
					Go Back!
				</button>
			</div>
		</div>
	</div>
};
