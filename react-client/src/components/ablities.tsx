import { type Ability, TEXT } from "../pokedex.ts";

export const Abilities = ({ abilities }: { abilities: Ability[] }) => (
	<div className="mt-6">
		<h2 className="text-3xl font-bold text-base-content mb-4">{TEXT.abilities}</h2>
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
			{abilities.map(({ name, flavour_text, effect }) => (
				<div key={`pokemon-ability-${name}`} className="card bg-base-100 shadow-lg">
					<div className="card-body">
						<h3 className="card-title text-xl text-primary capitalize">{name}</h3>
						<p className="text-base text-base-content/70 italic mb-2">{flavour_text}</p>
						<p className="text-sm text-base-content/60">{effect}</p>
					</div>
				</div>
			))}
		</div>
	</div>
);
