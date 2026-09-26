import { defineConfig } from 'vite';

// Self-contained config so the parent project's PostCSS/Tailwind setup is not picked up.
export default defineConfig({
  base: './',
  css: { postcss: { plugins: [] } },
  build: { chunkSizeWarningLimit: 2000 },
});
