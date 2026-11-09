import { render } from '@testing-library/svelte';
import { pokemonDetailCases } from '$lib/pokemon-detail.cases';
import PokemonDetail from './PokemonDetail.svelte';

pokemonDetailCases((pokemon) => render(PokemonDetail, { pokemon, backend: 'elysia' }));
