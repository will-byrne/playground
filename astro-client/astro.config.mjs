// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Image optimization
  image: {
    domains: ['raw.githubusercontent.com'],
    remotePatterns: [{ protocol: 'https' }],
  },
  // Build output
  output: 'static',
});
