import { defineConfig } from 'vite';
import { parsePort } from './src/core/config';

const relay = `http://127.0.0.1:${parsePort(process.env['AGENTBUDDY_PORT'])}`;

export default defineConfig({
  build: {
    outDir: 'dist/ui',
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    proxy: {
      // changeOrigin rewrites Host to the relay's own, so its Host check passes.
      '/stream': { target: relay, changeOrigin: true },
    },
  },
});
