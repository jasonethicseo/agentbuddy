// The theme token file and the color rule (themes Requirements 3.1–3.3, 3.6, 11.1).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEME_BACKGROUND } from '../../src/app/window-options';
import { THEMES } from '../../src/core/theme';
import { ROOT, THEMES_CSS, THEME_FILES, TOKEN_FILES, UI, hex, parseThemes, resolve } from './theme-tokens';

const blocks = parseThemes();

/** UI files outside the theme token files. */
function uiFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (name === 'public') continue;
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(css|ts)$/.test(name) && !TOKEN_FILES.includes(p)) out.push(p);
    }
  };
  walk(UI);
  return [...out, join(ROOT, 'index.html'), join(ROOT, 'popup.html')];
}

/** Properties whose values are colors, or hold them. */
const COLOR_PROPS = /^(color|background(-color|-image)?|border(-(top|right|bottom|left))?(-color)?|outline(-color)?|fill|stroke|box-shadow|text-shadow|accent-color|caret-color|text-decoration-color)$/;
/** What may remain in such a value once every `var(…)` is taken out. */
const ALLOWED_WORDS = new Set([
  'transparent', 'currentcolor', 'none', 'inherit', 'initial', 'unset', 'solid', 'dashed', 'dotted', 'to', 'top', 'right',
  'bottom', 'left', 'center', 'circle', 'ellipse', 'in', 'srgb', 'linear-gradient', 'repeating-linear-gradient',
  'radial-gradient', 'repeating-radial-gradient', 'color-mix', 'inset',
]);
function leftover(value: string): string[] {
  let v = value;
  for (let i = 0; i < 5; i++) v = v.replace(/var\(--[a-z0-9-]+(?:\s*,[^()]*)?\)/g, ' ');
  return (v.match(/#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|[a-zA-Z][a-zA-Z-]*/g) ?? [])
    .map((w) => w.toLowerCase())
    .filter((w) => !ALLOWED_WORDS.has(w) && !/^(px|em|rem|deg|s|ms|vh|vw)$/.test(w));
}

describe('theme token files', () => {
  it('themes.css imports exactly the two theme files', () => {
    const css = readFileSync(THEMES_CSS, 'utf8');
    expect([...css.matchAll(/@import '([^']+)';/g)].map((m) => join(UI, 'styles', m[1]!)).sort()).toEqual(Object.values(THEME_FILES).sort());
  });

  it('has one block per theme, each also for [data-theme-preview] (Requirement 2.1)', () => {
    for (const t of THEMES) expect(blocks[t].selector).toContain(`[data-theme-preview="${t}"]`);
  });

  it('defines exactly the same token names in both themes (Requirement 3.2)', () => {
    const [a, b] = THEMES.map((t) => [...blocks[t].tokens.keys()].sort());
    expect(a).toEqual(b);
    expect(a!.length).toBeGreaterThan(100);
    expect(new Set(a).size).toBe(a!.length);
  });

  it('gives every token a value, and every alias a token of the same theme', () => {
    for (const t of THEMES) for (const name of blocks[t].tokens.keys()) expect([t, name, resolve(blocks[t], name)]).not.toEqual([t, name, '']);
  });

  it('hides the page until it has a theme, and squares the corners of an opaque window', () => {
    const css = readFileSync(THEMES_CSS, 'utf8');
    expect(css).toMatch(/html:not\(\[data-theme\]\) body \{\s*visibility: hidden;\s*\}/);
    expect(css).toMatch(/:root\[data-frame="opaque"\] \{\s*--radius-window: 0px;\s*\}/);
  });

  it('the native window background of each theme equals its --bg (Requirement 3.6)', () => {
    for (const t of THEMES) expect(THEME_BACKGROUND[t]).toBe(hex(blocks[t], '--bg'));
  });
});

describe('the color rule (Requirement 3.3)', () => {
  it('no UI script, page or other stylesheet holds a hex, rgb() or hsl() color', () => {
    for (const f of uiFiles()) {
      const text = readFileSync(f, 'utf8');
      expect([f.slice(ROOT.length), text.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|\b(rgba?|hsla?)\(/g)]).toEqual([f.slice(ROOT.length), null]);
    }
  });

  it('color properties in other stylesheets use only tokens and color-free keywords', () => {
    let checked = 0;
    for (const f of uiFiles().filter((x) => x.endsWith('.css'))) {
      const css = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const d of css.matchAll(/(?:^|[;{\s])([a-z-]+)\s*:\s*([^;{}]+)/g)) {
        if (!COLOR_PROPS.test(d[1]!)) continue;
        checked++;
        expect([f.slice(ROOT.length), d[1], d[2]!.trim(), leftover(d[2]!)]).toEqual([f.slice(ROOT.length), d[1], d[2]!.trim(), []]);
      }
    }
    expect(checked).toBeGreaterThan(80);
  });

  it('the rule itself catches a hard-coded color', () => {
    expect(leftover('1px solid var(--frame)')).toEqual([]);
    expect(leftover('repeating-linear-gradient(90deg, var(--a) 0 6px, var(--b) 6px 8px)')).toEqual([]);
    expect(leftover('white')).toEqual(['white']);
    expect(leftover('1px solid red')).toEqual(['red']);
    expect(leftover('0 2px 0 #123456')).toEqual(['#123456']);
  });
});

describe('new UI code inserts no HTML (messenger-app Requirement 6.9, themes Requirement 6.9)', () => {
  it('theme.ts and the sprite modules build nodes with createElement(NS) and attributes only', () => {
    const files = [join(UI, 'theme.ts'), ...readdirSync(join(UI, 'sprites')).map((n) => join(UI, 'sprites', n))];
    for (const f of files) expect([f.slice(ROOT.length), readFileSync(f, 'utf8').match(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|DOMParser|createContextualFragment/g)]).toEqual([f.slice(ROOT.length), null]);
  });
});
