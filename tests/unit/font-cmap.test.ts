// The WOFF2 character-map reader used by the font tests (retro-skin Requirement 3.8).
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { codePoints } from './font-cmap';
const FONTS = join(import.meta.dirname, '../../src/ui/public/fonts');
const has = (set: Set<number>, text: string) => [...text].every((c) => set.has(c.codePointAt(0)!));
describe('codePoints', () => {
  it.each(['Galmuri11.woff2', 'Galmuri11-Bold.woff2', 'Galmuri9.woff2'])('%s maps ASCII and Hangul, not ✓ or ✎', (file) => {
    const set = codePoints(join(FONTS, file));
    const ascii = Array.from({ length: 95 }, (_, i) => String.fromCodePoint(32 + i)).join('');
    expect(has(set, ascii)).toBe(true);
    expect(has(set, '가띠링')).toBe(true);
    expect(set.has(0x2713)).toBe(false);
    expect(set.has(0x270e)).toBe(false);
  });
  it('Galmuri11 Bold lacks ▸ and −, which Regular has', () => {
    const bold = codePoints(join(FONTS, 'Galmuri11-Bold.woff2'));
    const regular = codePoints(join(FONTS, 'Galmuri11.woff2'));
    expect([bold.has(0x25b8), bold.has(0x2212)]).toEqual([false, false]);
    expect([regular.has(0x25b8), regular.has(0x2212)]).toEqual([true, true]);
  });
});
