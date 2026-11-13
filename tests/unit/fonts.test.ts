// Glyph coverage of the bundled Galmuri files over everything the UI sets as text (retro-skin Requirements 3.8, 4.5).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GALMURI_MISSING } from '../../src/ui/fallback';
import { codePoints } from './font-cmap';
const ROOT = join(import.meta.dirname, '../..');
const FONTS = join(ROOT, 'src/ui/public/fonts');
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? (n === 'public' ? [] : walk(join(d, n))) : [join(d, n)]));
const stripComments = (c: string) => c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/ \/\/ .*$/gm, '');
/**
 * The UI's character set (design "Fonts"): string literals of the UI scripts, core/text.ts and core/tips.ts, the text of
 * both pages, and the quoted `content` tokens of the skin files. Agent text and the user's own status are not part of it:
 * they can hold any character and fall back per character.
 */
function uiCharacters(): Set<string> {
  let chars = '';
  const scripts = [...walk(join(ROOT, 'src/ui')).filter((f) => f.endsWith('.ts') && !f.endsWith('fallback.ts')), join(ROOT, 'src/core/text.ts'), join(ROOT, 'src/core/tips.ts')];
  for (const f of scripts) for (const m of stripComments(readFileSync(f, 'utf8')).matchAll(/'([^'\n]*)'|`([^`\n]*)`|"([^"\n]*)"/g)) chars += m[1] ?? m[2] ?? m[3];
  for (const page of ['index.html', 'popup.html']) for (const m of readFileSync(join(ROOT, page), 'utf8').matchAll(/>([^<]+)</g)) chars += m[1];
  for (const skin of ['blue-bot', 'strawberry-milk']) {
    for (const m of readFileSync(join(ROOT, `src/ui/styles/themes/${skin}.css`), 'utf8').matchAll(/:\s*"([^"]*)"/g)) chars += m[1];
  }
  return new Set([...chars].filter((c) => c.codePointAt(0)! >= 32));
}
const FILES = { regular: 'Galmuri11.woff2', bold: 'Galmuri11-Bold.woff2', small: 'Galmuri9.woff2' } as const;
describe('Galmuri coverage', () => {
  const ui = uiCharacters();
  it.each(Object.entries(FILES))('%s: the recorded gaps are exactly the UI characters %s lacks', (weight, file) => {
    const has = codePoints(join(FONTS, file));
    const missing = [...ui].filter((c) => !has.has(c.codePointAt(0)!)).sort().join('');
    expect(missing).toBe([...GALMURI_MISSING[weight as keyof typeof FILES]].sort().join(''));
  });
  it('✓ and ✎ are never set as text: they are pixel icons (Requirement 4.5)', () => {
    expect([ui.has('✓'), ui.has('✎'), ui.has('−')]).toEqual([false, false, false]);
  });
  it('▸ comes only from the working-glyph tokens, which are drawn in regular weight', () => {
    for (const skin of ['blue-bot', 'strawberry-milk']) {
      const css = readFileSync(join(ROOT, `src/ui/styles/themes/${skin}.css`), 'utf8');
      const holders = [...css.matchAll(/(--[a-z-]+):\s*"[^"]*▸[^"]*"/g)].map((m) => m[1]);
      expect(holders.every((t) => t === '--glyph-work' || t === '--badge-work')).toBe(true);
    }
    const list = readFileSync(join(ROOT, 'src/ui/styles/list.css'), 'utf8');
    const sprites = readFileSync(join(ROOT, 'src/ui/styles/sprites.css'), 'utf8');
    expect(list).toContain('.lead-work::before { content: var(--glyph-work) " "; font-weight: 400; }');
    expect(sprites).toMatch(/\.badge \{[^}]*font-weight: 400;/);
    for (const f of walk(join(ROOT, 'src/ui/styles'))) {
      if (f.includes('/themes/')) continue;
      const uses = [...readFileSync(f, 'utf8').matchAll(/[^\n]*var\(--glyph-work\)[^\n]*/g)].map((m) => m[0]);
      for (const u of uses) expect([f, u.includes('font-weight: 400')]).toEqual([f, true]);
    }
  });
});
