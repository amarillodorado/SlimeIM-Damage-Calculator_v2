import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// `base: './'` keeps asset URLs relative, so the build works from any sub-path
// (GitHub Pages or another static host).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173 },
  test: {
    // Keep per-file isolation without the repeated Windows child-process startup cost.
    pool: 'threads',
    environment: 'node',
    setupFiles: ['src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
