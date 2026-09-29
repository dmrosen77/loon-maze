import { defineConfig } from 'vite';

export default defineConfig({
  // Build with relative paths, so the game works wherever it's hosted,
  // including GitHub Pages at https://dmrosen77.github.io/loon-maze/ (a
  // subfolder, not the site root).
  base: './',
});
