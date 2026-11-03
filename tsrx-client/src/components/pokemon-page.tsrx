import { useEffect, useState } from "react";
import { type Backend, type PokeboxEntry, TEXT, fetchPokemon, homePath, navigate } from "../pokedex.ts";
import { PokemonCard } from "./pokemon-card.tsrx";

type State = { status: "loading" } | { status: "loaded"; pokemon: PokeboxEntry } | { status: "not-found" };

export const PokemonPage = ({ idOrName, backend }: { idOrName: string; backend: Backend }) => @{
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    fetchPokemon(backend, idOrName)
      .then((pokemon) => setState({ status: "loaded", pokemon }))
      .catch((err) => {
        console.error("Error fetching Pokémon:", err);
        setState({ status: "not-found" });
      });
  }, [backend, idOrName]);

  @if (state.status === "loaded") {
    <PokemonCard pokeboxEntry={state.pokemon} backend={backend} />
  } @else {
    <div className="pd-page">
      <div className="pd-container pd-container--wide">
        @if (state.status === "loading") {
          <p className="pd-loading">{TEXT.loading}</p>
        } @else {
          <div className="pd-center">
            <h1 className="pd-title pd-title--detail" style={{ marginBottom: "1rem" }}>
              {TEXT.notFoundTitle}
            </h1>
            <p className="pd-subtitle" style={{ marginBottom: "1.5rem" }}>
              {TEXT.notFound(idOrName)}
            </p>
            <button type="button" className="pd-btn pd-btn--primary" onClick={() => navigate(homePath(backend))}>
              {TEXT.backToList}
            </button>
          </div>
        }
      </div>
    </div>
  }
};
