import type { MetaFunction } from "@remix-run/node";
import {
  useLoaderData,
  useNavigate,
  useParams,
  useSearchParams,
} from "@remix-run/react";
import { useState } from "react";
import {
  TEXT,
  canGoToNext,
  canGoToPrevious,
  fetchPokemon,
  formatDescription,
  formatDexNo,
  formatSpriteName,
  getBackend,
  getBackendFromSearch,
  getDefaultSpriteKey,
  getDisplaySpriteKey,
  getShinySpriteKey,
  getSprites,
  getTypeColor,
  homePath,
  pokemonPath,
  type PokeboxEntry,
} from "utils/pokedex";

export const loader = async ({
  params,
  request,
}: {
  params: { idOrName: string };
  request: Request;
}) => {
  const backend = getBackendFromSearch(new URL(request.url).search);
  try {
    return { pokemon: await fetchPokemon(backend, params.idOrName) };
  } catch (error) {
    console.error("Error fetching Pokémon:", error);
    return { pokemon: null };
  }
};

export const meta: MetaFunction = ({ data }) => {
  const pokemon = (data as { pokemon: PokeboxEntry | null } | undefined)?.pokemon;
  return [{ title: pokemon ? `${pokemon.name} | ${TEXT.title}` : TEXT.notFoundTitle }];
};

export default function Pokemon() {
  const { pokemon } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const backend = getBackend(searchParams.get("backend"));

  if (!pokemon) {
    return (
      <div className="min-h-screen bg-base-200 p-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-base-content mb-4">{TEXT.notFoundTitle}</h1>
            <p className="text-xl text-base-content/70 mb-6">
              {TEXT.notFound(params.idOrName ?? "")}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(homePath(backend))}
            >
              {TEXT.backToList}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Keyed on the id so sprite selection resets when moving to another Pokémon.
  return <PokemonDetail key={pokemon.id} pokemon={pokemon} backend={backend} />;
}

function PokemonDetail({
  pokemon,
  backend,
}: {
  pokemon: PokeboxEntry;
  backend: ReturnType<typeof getBackend>;
}) {
  const navigate = useNavigate();
  const spriteList = getSprites(pokemon.sprites);
  const [selectedSpriteKey, setSelectedSpriteKey] = useState(() => getDefaultSpriteKey(spriteList));
  const [showShiny, setShowShiny] = useState(false);
  const displaySpriteKey = getDisplaySpriteKey(spriteList, selectedSpriteKey, showShiny);
  const hasShiny = Boolean(getShinySpriteKey(spriteList, selectedSpriteKey));

  return (
    <div className="min-h-screen bg-base-200 p-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(homePath(backend))}
          >
            {TEXT.backToList}
          </button>
          <div className="flex items-center gap-4">
            {canGoToPrevious(pokemon.id) ? (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => navigate(pokemonPath(pokemon.id - 1, backend))}
                aria-label="Previous Pokémon"
              >
                {TEXT.previous}
              </button>
            ) : (
              <div className="w-20"></div>
            )}
            <div>
              <h1 className="text-4xl font-bold text-base-content mb-2 capitalize">
                {pokemon.name}
              </h1>
              <p className="text-xl text-base-content/70">{formatDexNo(pokemon.id)}</p>
            </div>
            {canGoToNext(pokemon.id) ? (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => navigate(pokemonPath(pokemon.id + 1, backend))}
                aria-label="Next Pokémon"
              >
                {TEXT.next}
              </button>
            ) : (
              <div className="w-20"></div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pokémon Image Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body items-center text-center">
              <img
                alt={`${pokemon.name} sprite`}
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
                {pokemon.types.map((type) => {
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
                {formatDescription(pokemon.species_description)}
              </p>
            </div>
          </div>
        </div>

        {/* Abilities Section */}
        <div className="mt-6">
          <h2 className="text-3xl font-bold text-base-content mb-4">{TEXT.abilities}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pokemon.abilities.map((ability) => (
              <div key={ability.name} className="card bg-base-100 shadow-lg">
                <div className="card-body">
                  <h3 className="card-title text-xl text-primary capitalize">{ability.name}</h3>
                  <p className="text-base text-base-content/70 italic mb-2">
                    {ability.flavour_text}
                  </p>
                  <p className="text-sm text-base-content/60">{ability.effect}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sprite Gallery */}
        <div className="mt-6">
          <h2 className="text-3xl font-bold text-base-content mb-4">{TEXT.sprites}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.entries(spriteList).map(([name, url]) => {
              const selected = name === selectedSpriteKey;
              return (
                <button
                  type="button"
                  key={name}
                  className={`card bg-base-100 shadow-md border ${selected ? "border-primary" : "border-transparent"}`}
                  onClick={() => setSelectedSpriteKey(name)}
                  aria-pressed={selected}
                >
                  <div className="card-body p-4 items-center cursor-pointer">
                    <img alt={name} src={url} className="w-16 h-16 object-contain" />
                    <p
                      className={`text-xs text-center mt-2 ${selected ? "text-primary font-semibold" : "text-base-content/60"}`}
                    >
                      {selected ? TEXT.selected : formatSpriteName(name)}
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
}
