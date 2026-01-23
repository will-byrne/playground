export const Abilities = ({
	abilities,
}: {
	abilities: {
		name: string;
		flavour_text: string;
		effect: string;
	}[];
}) => {
	return (
		<>
			<h2 className="text-2xl font-bold mt-4">Abilities</h2>
			<div className="stats shadow w-xl">
				{abilities.map(({ name, flavour_text, effect }) => (
					<div key={`pokemon-ability-${name}`} className="stat first:pl-0">
						<div className="stat-value ">{name}</div>
						<div className="stat-title text-wrap">{flavour_text}</div>
						<div className="stat-desc text-wrap">{effect}</div>
					</div>
				))}
			</div>
		</>
	);
};
