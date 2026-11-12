import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { parsePort } from './src/core/config';

const relay = `http://127.0.0.1:${parsePort(process.env['AGENTBUDDY_PORT'])}`;

export default defineConfig({
  build: {
    outDir: 'dist/ui',
    emptyOutDir: true,
    rollupOptions: {
      // The main window and the pop-up page (messenger-app design).
      input: { main: resolve(import.meta.dirname, 'index.html'), popup: resolve(import.meta.dirname, 'popup.html') },
    },
  },
  server: {
    host: '127.0.0.1',
    proxy: {
      // changeOrigin rewrites Host to the relay's own, so its Host check passes.
      '/stream': { target: relay, changeOrigin: true },
    },
  },
});
