// The built demo site (submission Requirements 1.2, 1.4, 5.2): no Node built-in, no address but the
// repository and video links and the SVG namespace, and every font URL resolves to a bundled file. Runs on
// `dist/demo` once `npm run build:demo` has made it (the workflow builds it before the tests).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../', import.meta.url).pathname;
const DIST = join(ROOT, 'dist/demo');
const ALLOWED_URLS = ['http://www.w3.org/2000/svg', 'https://github.com/jasonethicseo/agentbuddy', 'https://youtu.be/dd_SMLPNns4'];
const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(join(dir, d.name)) : [join(dir, d.name)]));

describe.skipIf(!existsSync(DIST))('dist/demo', () => {
  const all = files(DIST);
  const text = all.filter((f) => /\.(js|css|html)$/.test(f));

  it('has the three pages, the fonts and their licenses', () => {
    for (const f of ['index.html', 'window.html', 'popup.html', 'fonts/Galmuri11.woff2', 'fonts/Galmuri9.woff2', 'fonts/OFL-Galmuri.txt', 'fonts/OFL-NanumGothic.txt']) {
      expect(existsSync(join(DIST, f)), f).toBe(true);
    }
  });

  it('imports no Node built-in', () => {
    for (const f of text) expect(readFileSync(f, 'utf8'), f).not.toMatch(/from\s*["']node:|require\(["']node:/);
  });

  it('names no address except the repository and video links and the SVG namespace', () => {
    for (const f of text) {
      for (const url of readFileSync(f, 'utf8').match(/https?:\/\/[A-Za-z0-9./_%-]+/g) ?? []) expect(ALLOWED_URLS, `${f}: ${url}`).toContain(url);
    }
  });

  it('every CSS url() points to a file inside dist/demo, by a relative path', () => {
    for (const f of text.filter((x) => x.endsWith('.css'))) {
      for (const m of readFileSync(f, 'utf8').matchAll(/url\(([^)]+)\)/g)) {
        const ref = m[1]!.replace(/["']/g, '');
        if (ref.startsWith('data:')) continue;
        expect(ref.startsWith('/'), `${f}: ${ref}`).toBe(false);
        expect(existsSync(resolve(dirname(f), ref)), `${f}: ${ref}`).toBe(true);
      }
    }
  });

  it('every page loads its scripts and styles by relative paths', () => {
    for (const page of ['index.html', 'window.html', 'popup.html']) {
      const html = readFileSync(join(DIST, page), 'utf8');
      for (const m of html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)) expect(existsSync(join(DIST, m[1]!)), `${page}: ${m[1]}`).toBe(true);
      expect(html, page).not.toMatch(/(?:src|href)="\/(?!\/)/);
    }
  });
});
