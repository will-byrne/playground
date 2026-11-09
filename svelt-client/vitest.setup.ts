import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { afterEach, vi } from 'vitest';

afterEach(() => cleanup());

// SvelteKit's navigation module needs the page payload a real server injects.
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
