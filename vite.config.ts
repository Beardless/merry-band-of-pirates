import { defineConfig } from 'vitest/config';

// GitHub Pages serves the site from https://<user>.github.io/merry-band-of-pirates/,
// so production builds use that sub-path. `npm run dev` keeps serving from `/`.
// Override with BASE_PATH (e.g. BASE_PATH=./ npm run build) to host the build elsewhere.
const PAGES_BASE = '/merry-band-of-pirates/';

export default defineConfig(({ command }) => ({
  base: process.env.BASE_PATH ?? (command === 'build' ? PAGES_BASE : '/'),
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
}));
