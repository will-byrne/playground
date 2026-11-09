import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vitest/config';

// Unit tests, set up the same way in every web client.
export default defineConfig({
  plugins: [angular({ tsconfig: 'tsconfig.spec.json' })],
  test: {
    // Analog's zone.js setup patches the global test functions.
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
