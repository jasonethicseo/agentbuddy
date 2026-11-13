// Color tokens and contrast (messenger-app Requirement 6.13; design.md "Accessibility", "Palette").
// Text pairs need 4.5:1. Icons, dots and the glyphs of icon-only buttons (named by aria-label)
// are graphics and need 3:1. Task 10 adds the pairs its stylesheets use.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mainWindowOptions } from '../../src/app/window-options';

const ROOT = join(import.meta.dirname, '../..');
const UI = join(ROOT, 'src/ui');
const tokensText = readFileSync(join(UI, 'styles/tokens.css'), 'utf8');
const TOKENS = new Map([...tokensText.matchAll(/(--[a-z0-9-]+):\s*(#[0-9A-Fa-f]{6});/g)].map((m) => [m[1]!, m[2]!.toUpperCase()]));

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}
const color = (token: string) => {
  const v = TOKENS.get(token);
  if (v === undefined) throw new Error(`unknown token ${token}`);
  return v;
};

/** [foreground, background, where]. */
type Pair = [string, string, string];
const TEXT: Pair[] = [
  ['--text', '--body', 'window text, active tab'],
  ['--text', '--row', 'rows, cards, settings labels'],
  ['--text', '--alert-tint', 'unread needs-OK inbox row'],
  ['--text', '--done-tint', 'unread done inbox row'],
  ['--text-2', '--body', 'secondary text on the window'],
  ['--text-2', '--row', 'status excerpt, ages, notes'],
  ['--text-2', '--group', 'group counts'],
  ['--text-2', '--alert-tint', 'excerpt on the top needs-OK session row'],
  ['--text-2', '--done-tint', 'excerpt on the top done session row'],
  ['--group-text', '--group', 'group header'],
  ['--group-text', '--row', 'settings card titles'],
  ['--band-text', '--band', 'tabs, footer (11 px)'],
  ['--band-text', '--row', 'Kiro n/m, read inbox rows'],
  ['--band-text', '--body', 'done pop-up Later'],
  ['--alert-text', '--alert-strip', 'alert strip'],
  ['--alert-text', '--row', 'needs-OK phrase'],
  ['--alert-text', '--alert-tint', 'needs-OK phrase on a tinted row'],
  ['--ok-text', '--row', 'working phrase'],
  ['--alert-text', '--body', 'needs-OK phrase on a hovered row'],
  ['--ok-text', '--body', 'working phrase on a hovered row'],
  ['--done-text', '--body', 'done phrase on a hovered row'],
  ['--done-text', '--row', 'done phrase'],
  ['--done-text', '--done-tint', 'done phrase on a tinted row'],
  ['--frame', '--row', 'Mark all read (11 px)'],
  ['--on-fill', '--alert-strong', 'inbox badge (10 px), needs-OK Go there'],
  ['--on-fill', '--frame', 'done Go there'],
  ['--alert-later', '--alert-tint', 'needs-OK Later'],
  ['--on-fill', '--deep', 'title text on the blue gradient, with a --deep outline'],
  ['--on-fill', '--alert-text', 'needs-OK pop-up title, with an --alert-text outline'],
];
const GRAPHICS: Pair[] = [
  ['--on-fill', '--button', 'title bar and done pop-up × glyphs'],
  ['--on-fill', '--alert', 'close-to-menu-bar glyph, needs-OK icon glyph'],
  ['--on-fill', '--alert-strong', 'needs-OK pop-up × glyph'],
  ['--on-fill', '--ok', 'working icon glyph'],
  ['--on-fill', '--done', 'done icon check'],
  ['--on-fill', '--stale', 'stale icon glyph'],
  ['--alert', '--row', 'needs-OK icon, unread dot'],
  ['--alert', '--alert-tint', 'needs-OK icon on a tinted row'],
  ['--ok', '--row', 'working icon'],
  ['--alert', '--band', 'notice dot in the footer'],
  ['--done', '--row', 'done icon'],
  ['--done', '--done-tint', 'done icon on a tinted row'],
  ['--stale', '--row', 'stale icon'],
  ['--idle', '--row', 'idle crescent, Codex dot'],
];
/** Below 3:1 on purpose: each sits next to text that says the same (phrase, screen-reader name, footer text). */
const KNOWN_LOW: Pair[] = [
  ['--ring', '--row', 'offline and ended rings, muted dot'],
  ['--ok', '--band', 'connected dot next to "relay connected"'],
  ['--ring', '--band', 'muted dot next to "connecting to relay…"'],
];

describe('tokens', () => {
  it('are 6-digit hex colors, one per name', () => {
    const names = [...tokensText.matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]);
    expect(names.length).toBe(TOKENS.size);
    expect(TOKENS.size).toBeGreaterThan(30);
  });

  it('appear only in tokens.css: no other UI file holds a hex color', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (name === 'public') continue;
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(css|ts)$/.test(name) && !p.endsWith('tokens.css')) files.push(p);
      }
    };
    walk(UI);
    for (const name of ['index.html', 'popup.html']) files.push(join(ROOT, name));
    for (const f of files) expect([f, readFileSync(f, 'utf8').match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)]).toEqual([f, null]);
  });

  it('the main window background matches --body', () => {
    expect(mainWindowOptions({ preload: '/p', x: 0, y: 0, alwaysOnTop: true }).backgroundColor).toBe(color('--body'));
  });
});

describe('stylesheets', () => {
  const sheets = readdirSync(join(UI, 'styles')).filter((n) => n.endsWith('.css'));
  const defined = new Set([...TOKENS.keys(), '--font-text', '--font-title']);
  it.each(sheets)('%s uses only defined variables', (name) => {
    const used = [...readFileSync(join(UI, 'styles', name), 'utf8').matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]!);
    expect(used.filter((v) => !defined.has(v))).toEqual([]);
  });
  it('UI code never inserts HTML: agent text goes in with textContent only (Requirement 6.9)', () => {
    const code = ['main.ts', 'chrome.ts', 'dom.ts', 'icons.ts', 'bridge.ts', 'sound.ts', ...readdirSync(join(UI, 'screens')).map((n) => 'screens/' + n), ...readdirSync(join(UI, 'model')).map((n) => 'model/' + n)];
    for (const f of code) expect([f, readFileSync(join(UI, f), 'utf8').match(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|DOMParser|createContextualFragment/g)]).toEqual([f, null]);
  });
});

describe('contrast', () => {
  it.each(TEXT)('text %s on %s (%s) is at least 4.5:1', (fg, bg) => {
    expect(contrast(color(fg), color(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(GRAPHICS)('graphic %s on %s (%s) is at least 3:1', (fg, bg) => {
    expect(contrast(color(fg), color(bg))).toBeGreaterThanOrEqual(3);
  });

  it.each(KNOWN_LOW)('%s on %s (%s) stays the known exception', (fg, bg) => {
    expect(contrast(color(fg), color(bg))).toBeLessThan(3);
    expect(contrast(color(fg), color(bg))).toBeGreaterThan(2);
  });

  it('the plain title-bar white on the gradient is below 4.5:1, so the outline is needed', () => {
    expect(contrast(color('--on-fill'), color('--title-top'))).toBeLessThan(4.5);
    expect(contrast(color('--on-fill'), color('--alert-top'))).toBeLessThan(4.5);
  });
});
