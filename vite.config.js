import { defineConfig } from 'vite';

export default defineConfig({
  // Build with relative paths, so the game works wherever it's hosted,
  // including from a subfolder rather than a site root.
  base: './',
});
