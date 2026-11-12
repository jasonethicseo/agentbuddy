// Bundles the Node entry points into single files under dist/.
// One file per command keeps hook start-up fast and needs no runtime dependencies.
// The desktop app (main process and its two preloads) is bundled to CommonJS: sandboxed
// preloads cannot be ES modules, and `.cjs` because the package is "type": "module".
import { chmod } from 'node:fs/promises';
import { build } from 'esbuild';

const commands = [
  { in: 'src/hook/cli.ts', out: 'dist/hook.js' },
  { in: 'src/relay/main.ts', out: 'dist/relay.js' },
];
for (const entry of commands) {
  await build({
    entryPoints: [entry.in],
    outfile: entry.out,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    banner: { js: '#!/usr/bin/env node' },
    logLevel: 'warning',
  });
  await chmod(entry.out, 0o755);
}

const app = [
  { in: 'src/app/main.ts', out: 'dist/app/main.cjs' },
  { in: 'src/app/preload-main.ts', out: 'dist/app/preload-main.cjs' },
  { in: 'src/app/preload-popup.ts', out: 'dist/app/preload-popup.cjs' },
];
for (const entry of app) {
  await build({
    entryPoints: [entry.in],
    outfile: entry.out,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    external: ['electron'],
    logLevel: 'warning',
  });
}
