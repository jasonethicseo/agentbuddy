// Reads the theme token files (src/ui/styles/themes.css and themes/<id>.css) into one token map per theme,
// for the theme and contrast tests.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { THEMES } from '../../src/core/theme';
import type { ThemeId } from '../../src/core/theme';

export const ROOT = join(import.meta.dirname, '../..');
export const UI = join(ROOT, 'src/ui');
export const THEMES_CSS = join(UI, 'styles/themes.css');
/** Each theme's token file. */
export const THEME_FILES: Readonly<Record<ThemeId, string>> = {
  'blue-bot': join(UI, 'styles/themes/blue-bot.css'),
  'strawberry-milk': join(UI, 'styles/themes/strawberry-milk.css'),
};
/** themes.css and both theme files: the only UI stylesheets with color values. */
export const TOKEN_FILES: readonly string[] = [THEMES_CSS, ...Object.values(THEME_FILES)];

export interface ThemeBlock {
  selector: string;
  /** Token name → raw value, in file order. */
  tokens: Map<string, string>;
}

/** The two theme blocks of the token files (or of a given CSS text), by theme ID. Throws when a block is missing. */
export function parseThemes(css: string = TOKEN_FILES.map((f) => readFileSync(f, 'utf8')).join('\n')): Record<ThemeId, ThemeBlock> {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: Partial<Record<ThemeId, ThemeBlock>> = {};
  for (const m of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1]!.trim();
    const id = THEMES.find((t) => selector.includes(`:root[data-theme="${t}"]`));
    if (id === undefined) continue;
    const tokens = new Map<string, string>();
    for (const d of m[2]!.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) tokens.set(d[1]!, d[2]!.trim());
    out[id] = { selector, tokens };
  }
  for (const t of THEMES) if (out[t] === undefined) throw new Error(`themes.css has no block for ${t}`);
  return out as Record<ThemeId, ThemeBlock>;
}

/** A token's value with `var(--x)` aliases followed, within one theme. */
export function resolve(block: ThemeBlock, name: string, seen: Set<string> = new Set()): string {
  const v = block.tokens.get(name);
  if (v === undefined) throw new Error(`unknown token ${name}`);
  const alias = /^var\((--[a-z0-9-]+)\)$/.exec(v);
  if (alias === null) return v;
  if (seen.has(name)) throw new Error(`alias loop at ${name}`);
  seen.add(name);
  return resolve(block, alias[1]!, seen);
}

/** A token that must hold one 6-digit hex color, upper-cased. */
export function hex(block: ThemeBlock, name: string): string {
  const v = resolve(block, name);
  if (!/^#[0-9A-Fa-f]{6}$/.test(v)) throw new Error(`${name} is not a hex color: ${v}`);
  return v.toUpperCase();
}
