import { useLoaderData, useNavigate, useParams } from "@remix-run/react";
import { PokemonSprites } from "pokenode-ts";
import { useState } from "react";
import { typedFetch } from "utils/typed-fetch";

type PokeboxEntry = {
  id: number;
  name: string;
  species_description: string;
  types: string[];
  abilities: {
    name: string;
    flavour_text: string;
    effect: string;
  }[];
  sprites: PokemonSprites;
};

const getSprites = (sp: PokemonSprites, k?: string): Record<string, string> => {
  const result = Object.entries(sp).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (typeof value === "string" && value) {
        const newKey = `${k ? `${k}-` : ""}${key}`;
        acc[newKey] = value;
      } else if (value && typeof value === "object") {
        Object.assign(acc, getSprites(value, key));
      }
      return acc;
    },
    {}
  );

  return result;
};

export const loader = async ({ params }: { params: { idOrName: string } }) => {
  try {
    const pokemon = await typedFetch<PokeboxEntry>(
      `http://localhost:3000/pokemon/${params.idOrName}`
    );

    return { pokemon };
  } catch (error) {
    console.error('Error fetching Pokemon:', error);
    return { pokemon: null };
  }
};

export default function Pokemon() {
  const { pokemon } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const params = useParams();

  if (!pokemon) {
    return (
      <div className="min-h-screen bg-base-200 p-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-base-content mb-4">Pokemon Not Found</h1>
            <p className="text-xl text-base-content/70 mb-6">
              The Pokemon "{params.idOrName}" could not be found.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/')}
            >
              Back to list
            </button>
          </div>
        </div>
      </div>
    );
  }

  const [showShiny, setShowShiny] = useState(false);
  const spriteList = getSprites(pokemon.sprites);
  const officialArtFront =
    spriteList["showdown-front_default"] ??
    spriteList["official-artwork-front_default"];
  const officialArtShiny =
    spriteList["showdown-front_shiny"] ??
    spriteList["official-artwork-front_shiny"];

  return (
    <div className="min-h-screen bg-base-200 p-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mb-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/')}
            >
              Back to list
            </button>
            <div>
              <h1 className="text-4xl font-bold text-base-content mb-2">
                {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
              </h1>
              <p className="text-xl text-base-content/70">#{pokemon.id.toString().padStart(3, '0')}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pokemon Image Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body items-center text-center">
              <div className="relative">
                <img
                  alt={`${pokemon.name} sprite`}
                  src={showShiny ? officialArtShiny : officialArtFront}
                  className="max-w-full h-64 object-contain rounded-lg"
                />
                {officialArtShiny && (
                  <div className="absolute top-2 right-2">
                    <label className="label cursor-pointer">
                      <span className="label-text mr-2 text-base-content">Shiny</span>
                      <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={showShiny}
                        onChange={() => setShowShiny(!showShiny)}
                      />
                    </label>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {pokemon.types.map((type) => (
                  <div key={type} className="badge badge-primary badge-lg">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pokemon Details Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">Description</h2>
              <p className="text-base-content/80 leading-relaxed">
                {pokemon.species_description.replace(/\r?\n/g, " ")}
              </p>
            </div>
          </div>
        </div>

        {/* Abilities Section */}
        <div className="mt-6">
          <h2 className="text-3xl font-bold text-base-content mb-4">Abilities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pokemon.abilities.map((ability) => (
              <div key={ability.name} className="card bg-base-100 shadow-lg">
                <div className="card-body">
                  <h3 className="card-title text-xl text-primary">
                    {ability.name.charAt(0).toUpperCase() + ability.name.slice(1)}
                  </h3>
                  <p className="text-base-content/70 italic mb-2">
                    {ability.flavour_text}
                  </p>
                  <p className="text-sm text-base-content/60">
                    {ability.effect}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sprite Gallery */}
        <div className="mt-6">
          <h2 className="text-3xl font-bold text-base-content mb-4">Sprites</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.entries(spriteList).map(([name, url]) => (
              <div key={url} className="card bg-base-100 shadow-md">
                <div className="card-body p-4 items-center">
                  <img
                    alt={name}
                    src={url}
                    className="w-16 h-16 object-contain"
                  />
                  <p className="text-xs text-center text-base-content/60 mt-2">
                    {name.replace(/-/g, ' ').replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
