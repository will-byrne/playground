export const Abilities = ({
	abilities,
}: {
	abilities: {
		name: string;
		flavour_text: string;
		effect: string;
	}[];
}) => @{
  <>
    <h2 className="abilities-title">Abilities</h2>
    <div className="abilities-list">
      @for (const ability of abilities) {
        <div key={`pokemon-ability-${ability.name}`} className="ability-card">
            <div className="ability-card__name">{ability.name}</div>
            <div className="ability-card__flavor">{ability.flavour_text}</div>
            <div className="ability-card__effect">{ability.effect}</div>
          </div>
      }
    </div>
  </>
};