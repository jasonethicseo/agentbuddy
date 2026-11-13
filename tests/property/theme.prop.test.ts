// Reading a theme always ends in one of the two themes (themes Requirements 1.2, 1.3, 11.2).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { THEMES, isTheme, parseTheme } from '../../src/core/theme';

describe('parseTheme', () => {
  it('gives one of the two themes for any JSON value and never throws', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (v) => {
        expect(THEMES).toContain(parseTheme(v));
      }),
      { numRuns: 1000 },
    );
  });

  it('gives one of the two themes for any string, and the default for every string that is not a theme', () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.string({ unit: 'grapheme' }), fc.constantFrom(...THEMES).map((t) => ` ${t}`)), (s) => {
        const t = parseTheme(s);
        expect(THEMES).toContain(t);
        expect(t).toBe(isTheme(s) ? s : 'blue-bot');
      }),
      { numRuns: 1000 },
    );
  });

  it('is the identity on the two themes', () => {
    fc.assert(fc.property(fc.constantFrom(...THEMES), (t) => parseTheme(t) === t));
  });
});
