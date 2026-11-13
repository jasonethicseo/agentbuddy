// The built UI ships its fonts and licenses and fetches nothing (messenger-app Requirement 16.5).
// Builds into a temp folder so dist/ui, which the running relay serves, is left alone.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '../..');
const FONTS = ['NanumGothic-Regular.ttf', 'NanumGothic-Bold.ttf', 'NanumGothic-ExtraBold.ttf', 'Galmuri11.woff2', 'Galmuri11-Bold.woff2', 'Galmuri9.woff2'];
const LICENSES = ['OFL-NanumGothic.txt', 'OFL-Galmuri.txt'];
/** SHA-256 of the files taken from npm `galmuri` 2.40.3 (retro-skin task 1.1). */
const GALMURI_SHA256: Readonly<Record<string, string>> = {
  'Galmuri11.woff2': 'f467d1b10e6b88dfa8399c9f93b38c7643e050abfe4fc15800ac0b000f5a57d6',
  'Galmuri11-Bold.woff2': '8643094f395aa2dbad6bc4385cc043314801eaec2e759d549435ec8ac4f2d078',
  'Galmuri9.woff2': '275d995906625eaaa5d2d9baa0a80f90a5c033c381c0dc2108a8729d371041a6',
  'OFL-Galmuri.txt': '86a3ee9495f942f0243f18c103da9faca27adb88142613edb8bb852e56c892c1',
};
/** XML namespace names are identifiers, never fetched. */
const ALLOWED_URLS = new Set(['http://www.w3.org/2000/svg']);
let out: string;

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : [join(dir, n)]));

beforeAll(() => {
  out = mkdtempSync(join(tmpdir(), 'agentbuddy-ui-'));
  execFileSync(process.execPath, [join(ROOT, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', out, '--emptyOutDir', '--logLevel', 'error'], {
    cwd: ROOT,
    env: { ...process.env, VITE_CONFIG_NATIVE_IGNORE_WARNING: 'true' },
    stdio: 'pipe',
  });
}, 60_000);
afterAll(() => rmSync(out, { recursive: true, force: true }));

describe('built UI', () => {
  it('holds both pages', () => {
    for (const page of ['index.html', 'popup.html']) expect(statSync(join(out, page)).isFile()).toBe(true);
  });

  it.each([...FONTS, ...LICENSES])('ships fonts/%s unchanged', (name) => {
    expect(readFileSync(join(out, 'fonts', name)).equals(readFileSync(join(ROOT, 'src/ui/public/fonts', name)))).toBe(true);
  });

  it('the licenses are the SIL Open Font License 1.1', () => {
    for (const name of LICENSES) expect(readFileSync(join(out, 'fonts', name), 'utf8')).toContain('SIL OPEN FONT LICENSE Version 1.1');
  });

  it('no HTML, JavaScript or CSS file contains an http: or https: URL', () => {
    const code = files(out).filter((f) => /\.(html|js|css)$/.test(f));
    expect(code.length).toBeGreaterThan(3);
    for (const f of code) {
      const urls = (readFileSync(f, 'utf8').match(/https?:\/\/[^\s"'`)<>]+/g) ?? []).filter((u) => !ALLOWED_URLS.has(u));
      expect([f.slice(out.length), urls]).toEqual([f.slice(out.length), []]);
    }
  });

  it('every @font-face loads one of the bundled files from /fonts/', () => {
    const css = files(out).filter((f) => f.endsWith('.css')).map((f) => readFileSync(f, 'utf8')).join('\n');
    const srcs = [...css.matchAll(/@font-face\s*\{[^}]*?src:\s*url\(["']?([^"')]+)["']?\)/g)].map((m) => m[1]);
    expect(srcs.sort()).toEqual(FONTS.map((f) => `/fonts/${f}`).sort());
  });

  it.each(Object.keys(GALMURI_SHA256))('fonts/%s has the SHA-256 recorded when it was taken from npm (retro-skin Requirement 3.2)', (name) => {
    expect(createHash('sha256').update(readFileSync(join(out, 'fonts', name))).digest('hex')).toBe(GALMURI_SHA256[name]);
  });
  it('ships exactly the bundled fonts and licenses: no Jua, no Silkscreen (retro-skin Requirement 3.3)', () => {
    expect(readdirSync(join(out, 'fonts')).sort()).toEqual([...FONTS, ...LICENSES].sort());
  });

  it('UI text uses Galmuri11, small text Galmuri9, each then Nanum Gothic, with smoothing off (retro-skin Requirements 3.4, 3.5)', () => {
    const css = readFileSync(join(ROOT, 'src/ui/styles/fonts.css'), 'utf8');
    expect(css).toMatch(/--font-text:\s*'Galmuri11',\s*'Nanum Gothic',\s*sans-serif;/);
    expect(css).toMatch(/--font-small:\s*'Galmuri9',\s*'Nanum Gothic',\s*sans-serif;/);
    expect(css).toMatch(/html\s*\{\s*-webkit-font-smoothing:\s*none;\s*\}/);
    expect(css).not.toContain('font-title');
  });
});
