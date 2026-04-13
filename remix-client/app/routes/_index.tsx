import type { MetaFunction } from "@remix-run/node";
import { Form, useLoaderData, useNavigate } from "@remix-run/react";
import { useState } from "react";
import { typedFetch } from "utils/typed-fetch";

type PokedexEntry = { id: number; name: string };

export const loader = async () => {
  const unsortedDex = await typedFetch<PokedexEntry[]>(
    "http://localhost:3000/pokedex"
  );
  const sortedDex = unsortedDex.sort(({ id: ida }, { id: idb }) => ida - idb);

  return { pokedex: sortedDex };
};

export const meta: MetaFunction = () => {
  return [
    { title: "Pokémon Browser" },
    { name: "description", content: "Welcome to the Pokémon Browser!" },
  ];
};

export default function Index() {
  const { pokedex } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [idOrName, setIdOrName] = useState<string>("");
  const [filteredPokedex, setFilteredPokedex] = useState<PokedexEntry[]>([]);
  const [randomLoading, setRandomLoading] = useState(false);

  const handleInputChange = (value: string) => {
    setIdOrName(value);
    if (value.length > 0) {
      const filtered = pokedex
        .filter(
          (pokemon) =>
            pokemon.name.toLowerCase().includes(value.toLowerCase()) ||
            pokemon.id.toString().includes(value)
        )
        .slice(0, 10); // Limit to 10 results
      setFilteredPokedex(filtered);
    } else {
      setFilteredPokedex([]);
    }
  };

  const handleRandomNewPokemon = async () => {
    setRandomLoading(true);
    try {
      const pokemon = await typedFetch<{ id: number; name: string }>(
        "http://localhost:3000/pokemon/random-new"
      );
      navigate(`/pokemon/${pokemon.name}`);
    } catch (error) {
      console.error("Failed to fetch a random new Pokémon:", error);
    } finally {
      setRandomLoading(false);
    }
  };

  const featuredPokemon = [37, 77, 151, 647, 700]
    .map((id) => pokedex.find((p) => p.id === id))
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-base-content mb-4">
            Pokédex Explorer
          </h1>
          <p className="text-xl text-base-content/70">
            Discover and learn about Pokémon
          </p>
        </div>

        {/* Search Section */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">Search Pokémon</h2>
            <Form action={idOrName ? `/pokemon/${idOrName}` : "#"}>
              <div className="form-control">
                <label className="label" htmlFor="idOrNameInput">
                  <span className="label-text">
                    Enter Pokémon name or Pokédex number
                  </span>
                </label>
                <div className="join">
                  <input
                    id="idOrNameInput"
                    type="text"
                    placeholder="e.g. Pikachu, 25..."
                    className="input input-bordered join-item flex-1"
                    value={idOrName}
                    onChange={(e) => handleInputChange(e.currentTarget.value)}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary join-item"
                    disabled={!idOrName.trim()}
                  >
                    Search
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary join-item"
                    onClick={handleRandomNewPokemon}
                    disabled={randomLoading}
                  >
                    {randomLoading ? "Loading…" : "Random New Pokémon"}
                  </button>
                </div>
              </div>
            </Form>

            {/* Search Results */}
            {filteredPokedex.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Search Results</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredPokedex.map((pokemon) => (
                    <a
                      key={pokemon.id}
                      href={`/pokemon/${pokemon.name}`}
                      className="btn btn-outline btn-sm justify-start"
                    >
                      <span className="font-mono">
                        #{pokemon.id.toString().padStart(3, "0")}
                      </span>
                      <span className="ml-2 capitalize">{pokemon.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Featured Pokémon */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-base-content mb-6">
            Featured Pokémon
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {featuredPokemon.map((pokemon) => (
              <div
                key={pokemon!.id}
                className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="card-body p-4 text-center">
                  <h3 className="card-title text-lg justify-center mb-2">
                    #{pokemon!.id.toString().padStart(3, "0")}
                  </h3>
                  <p className="text-base font-semibold capitalize mb-4">
                    {pokemon!.name}
                  </p>
                  <a
                    href={`/pokemon/${pokemon!.name}`}
                    className="btn btn-primary btn-sm"
                  >
                    View Details
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body text-center">
            <h2 className="card-title text-2xl justify-center mb-4">
              Pokédex Statistics
            </h2>
            <div className="stats stats-vertical lg:stats-horizontal shadow">
              <div className="stat">
                <div className="stat-title">Total Pokémon</div>
                <div className="stat-value text-primary">{pokedex.length}</div>
                <div className="stat-desc">In this Pokédex</div>
              </div>
              <div className="stat">
                <div className="stat-title">Total Pokémon left to discover</div>
                <div className="stat-value text-secondary">
                  {1025 - pokedex.length}
                </div>
                <div className="stat-desc">
                  {pokedex.length === 1025
                    ? "All discovered!"
                    : "Keep exploring!"}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Last Updated</div>
                <div className="stat-value text-accent">2024</div>
                <div className="stat-desc">Data Version</div>
              </div>
            </div>
          </div>
        </div>

        {/* Browse Pokédex Pokémon */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">Browse Seen Pokémon</h2>
            <div className="form-control">
              <label className="label" htmlFor="dexSelector">
                <span className="label-text">
                  Select a Pokémon to view details
                </span>
              </label>
              <select
                id="dexSelector"
                className="select select-bordered select-lg ml-4"
                onChange={(e) => {
                  if (e.target.value) {
                    window.location.href = `/pokemon/${e.target.value}`;
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  Choose a Pokémon...
                </option>
                {pokedex.map((pokemon) => (
                  <option key={pokemon.id} value={pokemon.name}>
                    #{pokemon.id.toString().padStart(3, "0")} -{" "}
                    {pokemon.name.charAt(0).toUpperCase() +
                      pokemon.name.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
