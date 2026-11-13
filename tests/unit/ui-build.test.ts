// The built UI ships its fonts and licenses and fetches nothing (messenger-app Requirement 16.5).
// Builds into a temp folder so dist/ui, which the running relay serves, is left alone.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '../..');
const FONTS = ['NanumGothic-Regular.ttf', 'NanumGothic-Bold.ttf', 'NanumGothic-ExtraBold.ttf', 'Jua-Regular.ttf'];
const LICENSES = ['OFL-NanumGothic.txt', 'OFL-Jua.txt'];
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

  it('ships exactly the bundled fonts and licenses, and no Silkscreen (themes Requirement 5.2)', () => {
    expect(readdirSync(join(out, 'fonts')).sort()).toEqual([...FONTS, ...LICENSES].sort());
  });

  it('titles use Jua, then Nanum Gothic for the characters Jua lacks (themes task 2.2)', () => {
    const css = readFileSync(join(ROOT, 'src/ui/styles/fonts.css'), 'utf8');
    expect(css).toMatch(/--font-title:\s*'Jua',\s*'Nanum Gothic',\s*sans-serif;/);
  });
});
