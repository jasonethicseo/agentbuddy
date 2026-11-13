// Reading a theme always ends in one of the two themes (themes Requirements 1.2, 1.3, 11.2).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parseSettings } from '../../src/app/settings';
import { THEMES, isTheme, parseTheme } from '../../src/core/theme';
import { parseThemes } from '../unit/theme-tokens';

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

describe('token sets (themes Requirement 3.2)', () => {
  const blocks = parseThemes();
  const names = [...new Set(THEMES.flatMap((th) => [...blocks[th].tokens.keys()]))];
  it('every token name of either theme is defined by the other too', () => {
    fc.assert(
      fc.property(fc.constantFrom(...THEMES), fc.constantFrom(...names), (th, name) => {
        const other = THEMES.find((x) => x !== th)!;
        expect([name, blocks[th].tokens.has(name), blocks[other].tokens.has(name)]).toEqual([name, true, true]);
      }),
      { numRuns: 1000 },
    );
  });
});
describe('hideBanner (retro-skin Requirement 10.1)', () => {
  it('reads as a boolean for any JSON value, true only for true', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (v) => {
        const s = parseSettings({ hideBanner: v });
        expect(s.hideBanner).toBe(v === true);
      }),
      { numRuns: 1000 },
    );
  });
});
