import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// The demo page for GitHub Pages (submission design "Build"): the app's UI in frames, fed by a replay.
// `base: './'` keeps every URL relative, so the site works under /agentbuddy/ and locally.
const root = resolve(import.meta.dirname, 'demo');

export default defineConfig({
  root,
  base: './',
  // Fonts and their licenses, as for the app (messenger-app Requirement 16.5).
  publicDir: resolve(import.meta.dirname, 'src/ui/public'),
  build: {
    outDir: resolve(import.meta.dirname, 'dist/demo'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(root, 'index.html'),
        window: resolve(root, 'window.html'),
        popup: resolve(root, 'popup.html'),
      },
    },
  },
  // The pages load ../src/demo/*.ts; the dev server asks for them as /src/…, outside `root`. Map that to the repository's src.
  resolve: { alias: [{ find: /^\/src\//, replacement: `${resolve(import.meta.dirname, 'src')}/` }] },
  preview: { host: '127.0.0.1' },
  server: {
    host: '127.0.0.1',
    // The pages load modules from ../src; allow the repository root.
    fs: { allow: [resolve(import.meta.dirname)] },
  },
});
