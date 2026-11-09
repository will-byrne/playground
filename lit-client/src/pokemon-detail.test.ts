import './pokemon-card.js';
import type { PokemonCard } from './pokemon-card.js';
import { pokemonDetailCases } from './pokemon-detail.cases.js';

pokemonDetailCases(async pokemon => {
  const card = document.createElement('pokemon-card') as PokemonCard;
  card.pokemon = pokemon;
  card.backend = 'elysia';
  document.body.append(card);
  await card.updateComplete;
});
