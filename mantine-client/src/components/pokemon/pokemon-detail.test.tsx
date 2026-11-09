import { pokemonDetailCases } from '../../pokemon-detail.cases';
import { render } from '../../utils/test-renderer';
import { PokemonPage } from './pokemonpage';

pokemonDetailCases((pokemon) => render(<PokemonPage pokemon={pokemon} backend="elysia" />));
