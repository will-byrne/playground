import { createRemixStub } from "@remix-run/testing";
import { render } from "@testing-library/react";
import { pokemonDetailCases } from "utils/pokemon-detail.cases";
import Pokemon from "./routes/pokemon.$idOrName";

pokemonDetailCases((pokemon) => {
  const RemixStub = createRemixStub([
    { path: "/pokemon/:idOrName", Component: Pokemon, loader: () => ({ pokemon, errorKind: null }) },
  ]);
  render(<RemixStub initialEntries={[`/pokemon/${pokemon.name}`]} />);
});
