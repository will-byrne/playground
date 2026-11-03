import { type Ability, TEXT } from "../pokedex.ts";

export const Abilities = ({ abilities }: { abilities: Ability[] }) => @{
  <div className="pd-section--detail">
    <h2 className="pd-heading pd-heading--detail">{TEXT.abilities}</h2>
    <div className="pd-grid pd-grid--abilities">
      @for (const ability of abilities) {
        <div key={`pokemon-ability-${ability.name}`} className="pd-card pd-card--lg">
          <div className="pd-card__body">
            <h3 className="pd-card__title pd-card__title--ability">{ability.name}</h3>
            <p className="pd-ability-flavour">{ability.flavour_text}</p>
            <p className="pd-ability-effect">{ability.effect}</p>
          </div>
        </div>
      }
    </div>
  </div>
};
