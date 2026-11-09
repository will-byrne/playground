import { render } from "@testing-library/react";
import { pokemonDetailCases } from "../pokemon-detail.cases.ts";
import { PokemonCard } from "./pokemon-card.tsrx";

pokemonDetailCases((pokemon) => render(<PokemonCard pokeboxEntry={pokemon} backend="elysia" />));
