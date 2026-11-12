// P3: truncation (Requirements 6.1–6.4).
// P21: status lines (messenger-app Requirements 7.2–7.4).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { RANK } from '../../src/core/buddies';
import { TEXT_LIMIT } from '../../src/core/config';
import type { DisplayState } from '../../src/core/state';
import { PHRASES, SPEC_TASK_PHRASE, codePointLength, statusLine, statusParts, truncate } from '../../src/core/text';

const ELLIPSIS = '\u2026';

// Mix of full-range code points (astral and lone surrogates), graphemes,
// and whitespace-heavy text. `size: 'max'` lets lengths reach `maxLength`;
// fast-check's default size keeps strings far below the 120 limit.
const anyText = fc.oneof(
  fc.string({ unit: 'binary', maxLength: 20 }),
  fc.string({ unit: 'binary', maxLength: 300, size: 'max' }),
  fc.string({ unit: 'grapheme', maxLength: 200, size: 'max' }),
  fc
    .array(fc.constantFrom('a', 'é', '😀', ' ', '\n', '\t', '\u00a0', '\u2028', 'x y', '\uD83D', '\uDE00'), {
      minLength: 60,
      maxLength: 300,
      size: 'max',
    })
    .map((parts) => parts.join('')),
);

const collapse = (s: string) => s.replace(/\s+/gu, ' ').trim();

describe('P3 truncate', () => {
  it('returns at most 120 code points', () => {
    fc.assert(fc.property(anyText, (s) => codePointLength(truncate(s)) <= TEXT_LIMIT));
  });

  it('leaves no whitespace runs and no edge whitespace', () => {
    fc.assert(
      fc.property(anyText, (s) => {
        const out = truncate(s);
        expect(out).toBe(out.trim());
        expect(/\s\s/u.test(out)).toBe(false);
        expect(/[^\S ]/u.test(out)).toBe(false); // only plain spaces remain
      }),
    );
  });

  it('is a code point prefix of the collapsed input, so surrogate pairs stay whole', () => {
    fc.assert(
      fc.property(anyText, (s) => {
        const out = truncate(s);
        const input = Array.from(collapse(s));
        if (input.length <= TEXT_LIMIT) {
          expect(out).toBe(collapse(s));
          return;
        }
        expect(out.endsWith(ELLIPSIS)).toBe(true);
        const kept = Array.from(out.slice(0, -ELLIPSIS.length));
        expect(kept).toEqual(input.slice(0, kept.length));
        expect(kept.length).toBeLessThanOrEqual(TEXT_LIMIT - 1);
      }),
    );
  });

  it('is idempotent', () => {
    fc.assert(fc.property(anyText, (s) => truncate(truncate(s)) === truncate(s)));
  });
});

describe('P21 status lines', () => {
  const state = fc.constantFrom(...(Object.keys(RANK) as DisplayState[]));
  const text = fc.option(anyText, { nil: undefined });
  it('has no excerpt with hide-text on; otherwise an excerpt of at most 40 code points after the phrase', () => {
    fc.assert(
      fc.property(state, fc.boolean(), text, fc.boolean(), (s, inTask, t, hide) => {
        const parts = statusParts(s, inTask, t, hide);
        expect(parts.phrase).toBe(s === 'WORKING' && inTask ? SPEC_TASK_PHRASE : PHRASES[s]);
        if (hide || t === undefined) expect(parts).toEqual({ phrase: parts.phrase });
        if (parts.excerpt !== undefined) {
          expect(parts.excerpt).not.toBe('');
          expect(codePointLength(parts.excerpt)).toBeLessThanOrEqual(40);
          expect(statusLine(parts)).toBe(`${parts.phrase} · ${parts.excerpt}`);
          expect(codePointLength(statusLine(parts)) - codePointLength(parts.phrase)).toBeLessThanOrEqual(43);
        } else {
          expect(statusLine(parts)).toBe(parts.phrase);
        }
      }),
      { numRuns: 500 },
    );
  });
});
