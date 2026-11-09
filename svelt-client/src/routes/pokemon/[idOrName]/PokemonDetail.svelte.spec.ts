import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PokemonDetail from './PokemonDetail.svelte';
import type { PokeboxEntry } from '$lib/pokedex';

const vulpix: PokeboxEntry = {
	id: 37,
	name: 'vulpix',
	form_name: '',
	species_description: 'At the time of birth, it has just one tail.',
	types: ['fire'],
	abilities: [{ name: 'flash-fire', flavour_text: 'Powers up fire moves.', effect: 'Absorbs fire moves.' }],
	sprites: { front_default: '/37.png', front_shiny: '/37-shiny.png' },
	varieties: [
		{
			id: 10103,
			name: 'vulpix-alola',
			form_name: 'Alolan Form',
			is_default: false,
			species_description: 'It exhales air colder than -58 degrees Fahrenheit.',
			types: ['ice'],
			abilities: [
				{ name: 'snow-cloak', flavour_text: 'Ups evasion in a hailstorm.', effect: 'Increases evasion during hail.' }
			],
			sprites: { front_default: '/10103.png' }
		}
	]
};

describe('PokemonDetail forms', () => {
	it('hides the forms for a species with one form', async () => {
		render(PokemonDetail, { pokemon: { ...vulpix, varieties: [] }, backend: 'elysia' });

		await expect.element(page.getByRole('heading', { level: 1 })).toHaveTextContent('vulpix');
		await expect.element(page.getByRole('heading', { name: 'Forms' })).not.toBeInTheDocument();
	});

	it('starts on the Pokémon that was looked up', async () => {
		render(PokemonDetail, { pokemon: vulpix, backend: 'elysia' });

		await expect.element(page.getByRole('button', { name: 'Default Form' })).toHaveAttribute('aria-pressed', 'true');
		await expect.element(page.getByRole('button', { name: 'Alolan Form' })).toHaveAttribute('aria-pressed', 'false');
		await expect.element(page.getByText('fire', { exact: true })).toBeInTheDocument();
	});

	it("shows the selected form's description, types, abilities and sprites", async () => {
		render(PokemonDetail, { pokemon: vulpix, backend: 'elysia' });

		await page.getByRole('button', { name: 'Alolan Form' }).click();

		await expect.element(page.getByRole('button', { name: 'Alolan Form' })).toHaveAttribute('aria-pressed', 'true');
		await expect.element(page.getByText(/It exhales air colder than -58 degrees/)).toBeInTheDocument();
		await expect.element(page.getByText('ice', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByText('fire', { exact: true })).not.toBeInTheDocument();
		await expect.element(page.getByText('snow-cloak')).toBeInTheDocument();
		await expect.element(page.getByText('flash-fire')).not.toBeInTheDocument();
		await expect.element(page.getByAltText('vulpix-alola sprite')).toHaveAttribute('src', '/10103.png');
		// The heading stays the Pokémon that was looked up.
		await expect.element(page.getByRole('heading', { level: 1 })).toHaveTextContent('vulpix');
	});
});
