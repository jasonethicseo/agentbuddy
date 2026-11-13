// Properties of the tip choice (retro-skin Requirements 9.3, 9.6, 14.2).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applicableTips, applies, nextTip, startTip } from '../../src/core/tips';
import { THEMES } from '../../src/core/theme';
const context = fc.record({ theme: fc.constantFrom(...THEMES), sound: fc.boolean(), unread: fc.integer({ min: 0, max: 99 }) });
const day = fc.integer({ min: -1_000_000, max: 1_000_000 });
describe('tips', () => {
  it('the starting tip applies and is the same for the same day and context', () => {
    fc.assert(
      fc.property(day, context, (d, c) => {
        const t = startTip(d, c);
        expect(applies(t, c)).toBe(true);
        expect(startTip(d, { ...c })).toBe(t);
      }),
    );
  });
  it('pressing next n times visits every applicable tip once and comes back', () => {
    fc.assert(
      fc.property(day, context, (d, c) => {
        const n = applicableTips(c).length;
        const start = startTip(d, c);
        const seen: string[] = [];
        let t = start;
        for (let i = 0; i < n; i++) {
          t = nextTip(t, c);
          seen.push(t);
        }
        expect(t).toBe(start);
        expect([...seen].sort()).toEqual([...applicableTips(c)].sort());
      }),
    );
  });
});
