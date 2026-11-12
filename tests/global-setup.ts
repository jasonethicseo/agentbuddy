// Builds dist/hook.js and dist/relay.js once, before any test file runs.
// Test files run in parallel, so building per file could rewrite a bundle
// while another file is spawning it.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

export default function setup(): void {
  const root = join(import.meta.dirname, '..');
  execFileSync(process.execPath, [join(root, 'scripts/build-node.mjs')], { cwd: root, stdio: 'inherit' });
}
