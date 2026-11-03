import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

const data = {
	backend: 'elysia' as const,
	pokedex: [
		{ id: 1, name: 'bulbasaur' },
		{ id: 37, name: 'vulpix' }
	],
	error: null
};

describe('/+page.svelte', () => {
	it('should render h1', async () => {
		render(Page, { data });

		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toHaveTextContent('Pokédex Explorer');
	});

	it('should show featured Pokémon from the pokedex', async () => {
		render(Page, { data });

		await expect.element(page.getByText('#037', { exact: true })).toBeInTheDocument();
	});
});
