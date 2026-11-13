// Contrast in both skins (retro-skin Requirement 13, design "Contrast"; themes Requirements 9.1, 9.2; design.md "Accessibility").
// Text pairs need 4.5:1; icons, badges, marks, dots and focus rings are graphics and need 3:1.
// A graphic below 3:1 is allowed only when text beside it says the same; those are listed in KNOWN_LOW.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEMES } from '../../src/core/theme';
import type { ThemeId } from '../../src/core/theme';
import { UI, hex, parseThemes, resolve } from './theme-tokens';

const blocks = parseThemes();

function luminance(h: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}
/** A token's color in a skin; a transparent background means the white panel under it. */
function color(theme: ThemeId, token: string): string {
  return resolve(blocks[theme], token) === 'transparent' ? hex(blocks[theme], '--panel') : hex(blocks[theme], token);
}
const ratio = (theme: ThemeId, fg: string, bg: string) => contrast(color(theme, fg), color(theme, bg));

/** [foreground, background, where, the one skin that draws it (else both)]. */
type Pair = [string, string, string, ThemeId?];
const STATES = ['--st-wait', '--st-work', '--st-done', '--st-idle', '--st-stale', '--st-off'];
const STOPS = (prefix: string) => [1, 2, 3, 4].map((i) => `${prefix}-${i}`);
const on = (fg: string, bgs: string[], where: string, only?: ThemeId): Pair[] => bgs.map((bg): Pair => (only ? [fg, bg, where, only] : [fg, bg, where]));
/** Retro skin (retro-skin design "Contrast", Requirement 13): every gradient stop under the text is listed. */
const TEXT: Pair[] = [
  ...on('--text', ['--bg', '--panel', '--field', '--me-to', '--urgent-bg', '--popup-ok-tint', '--popup-done-tint'], 'primary text'),
  ...on('--text-2', ['--panel', '--field', '--me-to', '--urgent-bg', '--popup-ok-tint', '--popup-done-tint'], 'secondary text, status bar, fields'),
  ['--text-on-bg', '--bg', 'notes on the window background'],
  ...on('--group-text', ['--panel', '--bg', '--bevel-from', '--bevel-to', '--pressed'], 'group names, legends, Skin tile names'),
  ...on('--toolbar-text', ['--bevel-from', '--bevel-to', '--pressed'], 'toolbar labels'),
  ...on('--quiet-text', ['--bevel-from', '--bevel-to', '--pressed'], 'Later, Mark all read'),
  ...on('--title-text', STOPS('--gloss'), 'title bar (brief 2: gloss)'),
  ...on('--primary-text', ['--primary-from', '--primary-to'], 'Go there (S1)'),
  ['--selection-text', '--selection', 'selected buddy row (brief 2)'],
  ['--alert-strip-text', '--alert-strip-bg', 'alert strip'],
  ['--count-text', '--count-bg', 'Inbox count on the toolbar'],
  ['--unread-color', '--unread-bg', 'unread N tag', 'blue-bot'],
  ...on('--banner-head', ['--banner-1', '--banner-2'], 'banner headline (brief 2)'),
  ...on('--banner-body', ['--banner-1', '--banner-2'], 'banner body (brief 2)'),
  ...on('--popup-ok-text', STOPS('--popup-ok'), 'needs-OK pop-up header (brief 2)'),
  ...on('--popup-done-text', STOPS('--popup-done'), 'turn-done pop-up header (brief 2)'),
  ['--prog-text', '--panel', 'Kiro n/m'],
  ['--me-name', '--me-to', '"me"'],
  ['--me-status', '--me-field', 'my status message'],
  ['--me-online', '--me-to', '(online)'],
  ...STATES.map((st): Pair => [st, '--panel', 'buddy-row and session-row phrase']),
  ['--st-wait', '--urgent-bg', 'top needs-OK session row, unread needs-OK inbox row'],
  ['--st-wait', '--popup-ok-tint', 'needs-OK pop-up phrase'],
  ['--st-done', '--popup-done-tint', 'turn-done pop-up phrase'],
  ['--st-done', '--unread-tint', 'unread turn-done inbox row'],
];
const GRAPHICS: Pair[] = [
  ...on('--tbtn-glyph', ['--tbtn-from', '--tbtn-to'], 'pin and minimize glyphs (S1)'),
  ...on('--close-glyph', ['--close-from', '--close-to'], 'close-to-menu-bar glyph (S1)'),
  ...on('--popup-done-close-glyph', ['--popup-done-close-from', '--popup-done-close-to'], 'turn-done pop-up × (S3)'),
  ...on('--badge-line', [...STATES, '--popup-ok-close-bg'], 'white badge glyph and needs-OK pop-up × (D1)'),
  ...on('--focus', ['--bg', '--panel', '--field', '--toolbar-bg', '--bevel-to', '--pressed', '--popup-ok-tint', '--popup-done-tint'], 'focus ring'),
  ...on('--focus-on-gloss', STOPS('--gloss'), 'focus ring on the title bar (S14)'),
  ...on('--popup-ok-text', STOPS('--popup-ok'), 'focus ring on the needs-OK header (S14)'),
  ...on('--popup-done-text', STOPS('--popup-done'), 'focus ring on the turn-done header (S14)'),
  ...on('--focus-on-dark', ['--banner-1', '--banner-2', '--selection'], 'focus ring on the banner and the selected row (S14)'),
  ['--st-work', '--field', 'relay dot in the status bar'],
  ['--st-wait', '--field', 'notice dot in the status bar'],
  ...on('--icon-1', ['--bevel-from', '--bevel-to', '--pressed'], 'toolbar icons'),
  ...on('--icon-frame', ['--bevel-from', '--bevel-to', '--pressed'], 'skin swatch frame'),
  ...on('--px-berry-red', ['--panel', '--urgent-bg', '--unread-tint'], 'unread strawberry', 'strawberry-milk'),
  ...on('--unread-bg', ['--panel', '--urgent-bg', '--unread-tint'], 'unread N tag', 'blue-bot'),
  ['--unread-select-line', '--selection', 'unread marker frame in the selected row (S5)'],
  ['--st-idle', '--panel', 'Codex mark in Settings'],
  ['--st-off', '--panel', 'muted mark in Settings'],
];
/** `--banner-btn-bg` is white at 15 % over the banner stripes: the only translucent color in the token files. */
const BANNER_BTN_ALPHA = 0.15;
function over(stripe: string, alpha: number): string {
  const ch = (i: number) => Math.round(parseInt(stripe.slice(i, i + 2), 16) * (1 - alpha) + 255 * alpha);
  return `#${[1, 3, 5].map((i) => ch(i).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}
/** Below 3:1 on purpose: text beside them says the same (Requirement 13.2). [fg, bg, where, skins]. */
const KNOWN_LOW: Array<[string, string, string, readonly ThemeId[]]> = [
  ['--prog-done', '--field', 'progress cells and stripes; n/m says the same (D5)', THEMES],
  ['--prog-todo', '--field', 'to-do cells; n/m says the same (D5)', ['blue-bot']],
  ['--icon-2', '--bevel-to', "toolbar icons' second figure; the label says the same", THEMES],
  ['--icon-2', '--pressed', "toolbar icons' second figure; the label says the same", THEMES],
  ['--tree-box', '--panel', 'group box border; the folder name and aria-expanded say the same', THEMES],
];
/** Pairs of the themes look whose tokens go in retro-skin task 5.8, together with this list. */
const LEGACY_TEXT: Pair[] = [
  ['--text', '--card-bg', 'rows, cards, names'],
  ['--text-2', '--card-bg', 'excerpts, ages, notes'],
  ['--text-2', '--group-bg', 'group counts'],
  ['--group-text', '--group-bg', 'group header, idle tab'],
  ['--group-off-text', '--group-off-bg', 'offline group header'],
  ['--tab-active-text', '--tab-active-bg', 'active tab'],
  ['--quiet-text', '--quiet-bg', 'Later, Mark all read'],
  ['--primary-text', '--primary-bg', 'Go there'],
];
describe('contrast in both skins', () => {
  for (const theme of THEMES) {
    const mine = (pairs: Pair[]) => pairs.filter((p) => p[3] === undefined || p[3] === theme);
    it.each(mine([...TEXT, ...LEGACY_TEXT]))(`${theme}: text %s on %s (%s) is at least 4.5:1`, (fg, bg) => {
      expect(ratio(theme, fg, bg)).toBeGreaterThanOrEqual(4.5);
    });
    it.each(mine(GRAPHICS))(`${theme}: graphic %s on %s (%s) is at least 3:1`, (fg, bg) => {
      expect(ratio(theme, fg, bg)).toBeGreaterThanOrEqual(3);
    });
    it(`${theme}: the Next tip glyph on its translucent button over both stripes is at least 3:1`, () => {
      expect(resolve(blocks[theme], '--banner-btn-bg').replace(/\s/g, '')).toBe('rgba(255,255,255,.15)');
      for (const stripe of ['--banner-1', '--banner-2']) {
        expect(contrast(color(theme, '--focus-on-dark'), over(color(theme, stripe), BANNER_BTN_ALPHA))).toBeGreaterThanOrEqual(3);
      }
    });
  }
  it.each(KNOWN_LOW)('%s on %s (%s) stays a known exception', (fg, bg, _where, themes) => {
    for (const theme of themes) expect([theme, ratio(theme, fg, bg) < 3]).toEqual([theme, true]);
  });
  it('every color pair the brief names (brief 2) is checked', () => {
    const checked = new Set([...TEXT, ...GRAPHICS].map(([fg, bg]) => `${fg} ${bg}`));
    for (const pair of [
      '--title-text --gloss-1', '--title-text --gloss-4', '--tbtn-glyph --tbtn-from', '--close-glyph --close-from',
      '--selection-text --selection', '--text-2 --panel', '--banner-head --banner-1', '--banner-body --banner-2',
      '--popup-ok-text --popup-ok-3', '--popup-done-text --popup-done-3', '--primary-text --primary-from', '--toolbar-text --pressed',
    ]) expect([pair, checked.has(pair)]).toEqual([pair, true]);
  });
});
describe('stylesheets', () => {
  const sheets = readdirSync(join(UI, 'styles')).filter((n) => n.endsWith('.css'));
  const themeSheets = readdirSync(join(UI, 'styles/themes')).map((n) => join('themes', n));
  const all = [...sheets, ...themeSheets].map((n) => readFileSync(join(UI, 'styles', n), 'utf8'));
  // Every custom property any stylesheet declares; `--cells` is set by screens/list.ts through the CSSOM.
  const declared = new Set([...all.flatMap((css) => [...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]!)), '--cells']);

  it.each(sheets)('%s uses only defined variables', (name) => {
    const used = [...readFileSync(join(UI, 'styles', name), 'utf8').matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]!);
    expect(used.filter((v) => !declared.has(v))).toEqual([]);
  });

  it('the me row takes every color, border and radius from the --me-* tokens (messenger-app Requirement 18.7)', () => {
    const css = readFileSync(join(UI, 'styles/list.css'), 'utf8');
    const rules = [...css.matchAll(/^[^{}]*\.me-[^{]*\{[^}]*\}/gm)].map((m) => m[0]);
    expect(rules.length).toBeGreaterThan(5);
    for (const rule of rules) {
      const sel = rule.split('{')[0]!.trim();
      for (const v of rule.matchAll(/var\((--[a-z0-9-]+)\)/g)) expect([sel, v[1]!.startsWith('--me-') || v[1]!.startsWith('--font-')]).toEqual([sel, true]);
      expect(rule).not.toMatch(/border-radius:\s*\d/);
    }
  });

  it('UI code never inserts HTML: agent text goes in with textContent only (messenger-app Requirement 6.9)', () => {
    const code = [
      'main.ts', 'chrome.ts', 'dom.ts', 'bridge.ts', 'sound.ts', 'theme.ts',
      ...['screens', 'model', 'sprites'].flatMap((d) => readdirSync(join(UI, d)).map((n) => `${d}/${n}`)),
    ];
    for (const f of code) expect([f, readFileSync(join(UI, f), 'utf8').match(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|DOMParser|createContextualFragment/g)]).toEqual([f, null]);
  });
});
