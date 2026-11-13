// Contrast in both themes (themes Requirements 9.1, 9.2, 11.1; design "Contrast"; design.md "Accessibility").
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
/** A token's color in a theme; a transparent background means the card under it. */
function color(theme: ThemeId, token: string): string {
  return resolve(blocks[theme], token) === 'transparent' ? hex(blocks[theme], '--card-bg') : hex(blocks[theme], token);
}
const ratio = (theme: ThemeId, fg: string, bg: string) => contrast(color(theme, fg), color(theme, bg));

/** [foreground, background, where, the one theme that draws it (else both)]. */
type Pair = [string, string, string, ThemeId?];
const STATES = ['--st-wait', '--st-work', '--st-done', '--st-idle', '--st-stale', '--st-off'];

const TEXT: Pair[] = [
  ['--text', '--bg', 'window text'],
  ['--text', '--card-bg', 'rows, cards, names'],
  ['--text', '--unread-tint', 'unread inbox name, checked theme tile'],
  ['--text', '--urgent-bg', 'unread needs-OK inbox name'],
  ['--text-2', '--card-bg', 'excerpts, ages, notes, @ folder, inbox time'],
  ['--text-2', '--group-bg', 'group counts'],
  ['--text-2', '--urgent-bg', 'excerpt on the top needs-OK session row'],
  ['--text-2', '--unread-tint', 'excerpt on a hovered buddy row, unread done inbox row'],
  ['--text-on-bg', '--bg', 'footer (11 px)'],
  ['--text-on-bg', '--bg-pattern-color', 'footer over the background pattern (decision D8)'],
  ['--group-text', '--group-bg', 'group header, idle tab'],
  ['--group-text', '--card-bg', 'settings card titles, theme tile names'],
  ['--group-off-text', '--group-off-bg', 'offline group header'],
  ['--title-text', '--title-from', 'title bar, start of the gradient'],
  ['--title-text', '--title-to', 'title bar, end of the gradient'],
  ['--alert-strip-text', '--alert-strip-bg', 'alert strip'],
  ['--tab-active-text', '--tab-active-bg', 'active tab'],
  ['--on-fill', '--count-bg', 'Inbox count (10 px)'],
  ['--unread-color', '--unread-bg', 'unread N tag (9 px)', 'blue-bot'],
  ['--quiet-text', '--quiet-bg', 'Later, Mark all read'],
  ['--primary-text', '--primary-bg', 'Go there'],
  ['--popup-ok-text', '--popup-ok-from', 'needs-OK pop-up title, start'],
  ['--popup-ok-text', '--popup-ok-to', 'needs-OK pop-up title, end'],
  ['--popup-done-text', '--popup-done-from', 'turn-done pop-up title, start'],
  ['--popup-done-text', '--popup-done-to', 'turn-done pop-up title, end'],
  ['--prog-text', '--card-bg', 'Kiro n/m'],
  ['--me-name', '--me-bg', '"me"'],
  ['--me-status', '--me-bg', 'my status message'],
  ['--me-hint', '--me-bg', 'set your status hint'],
  ['--me-name', '--me-field', 'my status message while editing'],
  ...STATES.map((s): Pair => [s, '--card-bg', 'buddy-row phrase, pop-up phrase']),
  ...STATES.map((s): Pair => [s, '--unread-tint', 'phrase on a hovered buddy row']),
  ['--st-wait', '--urgent-bg', 'unread needs-OK inbox line'],
  ['--st-done', '--unread-tint', 'unread turn-done inbox line'],
];

const GRAPHICS: Pair[] = [
  ...STATES.map((s): Pair => [s, '--on-fill', 'badge fill under its white glyph (decision D1)']),
  ['--tbtn-glyph', '--tbtn-bg', 'pin and minimize glyphs, turn-done pop-up ×'],
  ['--on-fill', '--close-bg', 'close-to-menu-bar glyph, needs-OK pop-up ×'],
  ['--popup-done-close-glyph', '--popup-done-close-bg', 'turn-done pop-up × (decision D8)'],
  ['--group-text', '--group-bg', 'session row ×'],
  ['--unread-color', '--card-bg', 'unread ♥ on a row', 'strawberry-milk'],
  ['--focus', '--bg', 'focus ring on the window'],
  ['--focus', '--card-bg', 'focus ring on a card'],
  ['--st-work', '--bg', 'connected mark in the footer'],
  ['--st-wait', '--bg', 'notice mark in the footer'],
  ['--st-idle', '--card-bg', 'Codex mark in Settings'],
  ['--st-off', '--card-bg', 'muted mark in Settings'],
  ['--title-mark-color', '--title-from', 'title mark'],
  ['--title-mark-color', '--title-to', 'title mark'],
];

/** Below 3:1 on purpose; `n/m` beside the progress says the same (decision D5). [fg, bg, where, themes]. */
const KNOWN_LOW: Array<[string, string, string, readonly ThemeId[]]> = [
  ['--prog-done', '--prog-track', 'done cells and stripes', THEMES],
  ['--prog-todo', '--prog-track', 'to-do cells', ['blue-bot']],
];

describe('contrast in both themes', () => {
  for (const theme of THEMES) {
    const mine = (pairs: Pair[]) => pairs.filter((p) => p[3] === undefined || p[3] === theme);
    it.each(mine(TEXT))(`${theme}: text %s on %s (%s) is at least 4.5:1`, (fg, bg) => {
      expect(ratio(theme, fg, bg)).toBeGreaterThanOrEqual(4.5);
    });
    it.each(mine(GRAPHICS))(`${theme}: graphic %s on %s (%s) is at least 3:1`, (fg, bg) => {
      expect(ratio(theme, fg, bg)).toBeGreaterThanOrEqual(3);
    });
  }

  it.each(KNOWN_LOW)('%s on %s (%s) stays a known exception', (fg, bg, _where, themes) => {
    for (const theme of themes) expect([theme, ratio(theme, fg, bg) < 3]).toEqual([theme, true]);
  });

  it('the Strawberry Milk text-2 would fail on its pattern dots, so the footer needs --text-on-bg (decision D8)', () => {
    expect(ratio('strawberry-milk', '--text-2', '--bg-pattern-color')).toBeLessThan(4.5);
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
