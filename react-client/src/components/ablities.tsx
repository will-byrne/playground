import type { Ability } from "pokenode-ts";
import { getEnglishEntry } from "../utils/get-english-entry";

export const Abilities = ({ abilities }: { abilities: Ability[] }) => {
  return (
    <>
      <h2 className="text-2xl font-bold mt-4">Abilities</h2>
      <div className="stats shadow w-xl">
        {abilities.map((ability) => (
          <div className="stat first:pl-0">
            <div className="stat-value ">{ability.name}</div>
            <div className="stat-title text-wrap">
              {getEnglishEntry(ability.flavor_text_entries)?.flavor_text}
            </div>
            <div className="stat-desc text-wrap">
              {getEnglishEntry(ability.effect_entries)?.short_effect}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
