// Color tokens and contrast (messenger-app Requirement 6.13; design.md "Accessibility", "Palette").
// Text pairs need 4.5:1. Icons, dots and the glyphs of icon-only buttons (named by aria-label)
// are graphics and need 3:1. Task 10 adds the pairs its stylesheets use.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '../..');
const UI = join(ROOT, 'src/ui');
const tokensText = readFileSync(join(UI, 'styles/tokens.css'), 'utf8');
const TOKENS = new Map([...tokensText.matchAll(/(--[a-z0-9-]+):\s*(#[0-9A-Fa-f]{6});/g)].map((m) => [m[1]!, m[2]!.toUpperCase()]));
/** Tokens that name another token (`--me-status: var(--text-2)`), for values a theme may change later (Requirement 18.7). */
const ALIASES = new Map([...tokensText.matchAll(/(--[a-z0-9-]+):\s*var\((--[a-z0-9-]+)\);/g)].map((m) => [m[1]!, m[2]!]));
/** Size tokens such as `--me-tile-radius: 8px`. */
const SIZES = new Set([...tokensText.matchAll(/(--[a-z0-9-]+):\s*\d+px;/g)].map((m) => m[1]!));
/** Decoration characters such as `--glyph-work: "♪"` (themes Requirement 4). */
const STRINGS = new Set([...tokensText.matchAll(/(--[a-z0-9-]+):\s*"[^"]*";/g)].map((m) => m[1]!));

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}
const color = (token: string): string => {
  const target = ALIASES.get(token);
  if (target !== undefined) return color(target);
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
  ['--me-name', '--me-bg', '"me" in the me row'],
  ['--me-status', '--me-bg', 'my status message'],
  ['--me-hint', '--me-bg', 'set your status hint'],
  ['--me-name', '--me-field', 'my status message while editing'],
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
  ['--me-bubble', '--me-tile', 'bubble on the me tile'],
  ['--me-bubble-eyes', '--me-bubble', 'bubble eyes on the me tile'],
  ['--me-field-line', '--me-bg', 'status field border'],
];
/** Below 3:1 on purpose: each sits next to text that says the same (phrase, screen-reader name, footer text). */
const KNOWN_LOW: Pair[] = [
  ['--ring', '--row', 'offline and ended rings, muted dot'],
  ['--ok', '--band', 'connected dot next to "relay connected"'],
  ['--ring', '--band', 'muted dot next to "connecting to relay…"'],
];

describe('tokens', () => {
  it('are 6-digit hex colors, aliases of defined tokens, or pixel sizes, one per name', () => {
    const names = [...tokensText.matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]);
    expect(names.length).toBe(TOKENS.size + ALIASES.size + SIZES.size + STRINGS.size);
    expect(new Set(names).size).toBe(names.length);
    expect(TOKENS.size).toBeGreaterThan(30);
    for (const name of ALIASES.keys()) expect(color(name)).toMatch(/^#[0-9A-F]{6}$/);
  });
  it('the me row has its own tokens for every color, border and radius it uses (Requirement 18.7)', () => {
    const css = readFileSync(join(UI, 'styles/list.css'), 'utf8');
    const rules = [...css.matchAll(/^[^{}]*\.me-[^{]*\{[^}]*\}/gm)].map((m) => m[0]);
    expect(rules.length).toBeGreaterThan(5);
    for (const rule of rules) {
      for (const v of rule.matchAll(/var\((--[a-z0-9-]+)\)/g)) expect([rule.split('{')[0]!.trim(), v[1]!.startsWith('--me-') || v[1]!.startsWith('--font-')]).toEqual([rule.split('{')[0]!.trim(), true]);
      expect(rule).not.toMatch(/border-radius:\s*\d/);
    }
  });

  it('appear only in tokens.css: no other UI file holds a hex color', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (name === 'public') continue;
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(css|ts)$/.test(name) && !p.endsWith('tokens.css') && !p.endsWith('themes.css') && !p.includes('/styles/themes/')) files.push(p); // theme files: themes.test.ts
      }
    };
    walk(UI);
    for (const name of ['index.html', 'popup.html']) files.push(join(ROOT, name));
    for (const f of files) expect([f, readFileSync(f, 'utf8').match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)]).toEqual([f, null]);
  });

});

describe('stylesheets', () => {
  const sheets = readdirSync(join(UI, 'styles')).filter((n) => n.endsWith('.css'));
  // Every custom property any stylesheet declares (themes.css, sprites.css's per-sprite ones, fonts.css).
  const themeSheets = readdirSync(join(UI, 'styles/themes')).map((n) => join('themes', n));
  const declared = [...sheets, ...themeSheets].flatMap((n) => [...readFileSync(join(UI, 'styles', n), 'utf8').matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]!));
  // `--cells` is set by screens/list.ts through the CSSOM (the number of progress cells).
  const defined = new Set([...TOKENS.keys(), ...ALIASES.keys(), ...SIZES, ...STRINGS, ...declared, '--cells']);
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
