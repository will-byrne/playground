import { render } from "@testing-library/react";
import { pokemonDetailCases } from "../pokemon-detail.cases.ts";
import { PokemonCard } from "./pokemon-card.tsx";

pokemonDetailCases((pokemon) => render(<PokemonCard pokeboxEntry={pokemon} backend="elysia" />));
