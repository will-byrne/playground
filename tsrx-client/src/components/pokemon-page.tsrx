import { useEffect, useState } from "react";
import { type Backend, type FetchErrorKind, type PokeboxEntry, TEXT, fetchPokemon, getFetchErrorKind, homePath, navigate } from "../pokedex.ts";
import { PokemonCard } from "./pokemon-card.tsrx";

type State = { status: "loading" } | { status: "loaded"; pokemon: PokeboxEntry } | { status: "error"; kind: FetchErrorKind };

export const PokemonPage = ({ idOrName, backend }: { idOrName: string; backend: Backend }) => @{
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    fetchPokemon(backend, idOrName)
      .then((pokemon) => setState({ status: "loaded", pokemon }))
      .catch((err) => {
        console.error("Error fetching Pokémon:", err);
        setState({ status: "error", kind: getFetchErrorKind(err) });
      });
  }, [backend, idOrName]);

  @if (state.status === "loaded") {
    // Keyed so the selected form and sprite reset when moving to another Pokémon.
    <PokemonCard key={state.pokemon.id} pokeboxEntry={state.pokemon} backend={backend} />
  } @else {
    <div className="pd-page">
      <div className="pd-container pd-container--wide">
        @if (state.status === "loading") {
          <p className="pd-loading">{TEXT.loading}</p>
        } @else {
          <div className="pd-center">
            <h1 className="pd-title pd-title--detail" style={{ marginBottom: "1rem" }}>
              {TEXT.pokemonErrorTitle(state.kind)}
            </h1>
            <p className="pd-subtitle" style={{ marginBottom: "1.5rem" }}>
              {TEXT.pokemonError(idOrName, backend, state.kind)}
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
