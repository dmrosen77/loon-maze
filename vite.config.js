import { defineConfig } from 'vite';

export default defineConfig({
  // Build with relative paths, so the game works wherever it's hosted,
  // including from a subfolder rather than a site root.
  base: './',
  // During development, pass api/ requests to a local score server if one is
  // running (node server/scores-server.js). Without one, the game just uses
  // this device's high scores.
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3010',
    },
  },
});
