// Bundles the Node entry points into single files under dist/.
// One file per command keeps hook start-up fast and needs no runtime dependencies.
import { chmod } from 'node:fs/promises';
import { build } from 'esbuild';

const entries = [{ in: 'src/hook/cli.ts', out: 'dist/hook.js' }];

for (const entry of entries) {
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
