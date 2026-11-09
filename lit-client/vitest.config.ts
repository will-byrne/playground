import { defineConfig } from 'vitest/config';

// Unit tests, set up the same way in every web client.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
