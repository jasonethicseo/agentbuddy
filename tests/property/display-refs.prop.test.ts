// Kiro context references never show a local path (messenger-app bug fix, 2026-11-13).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { displayRefs, statusParts } from '../../src/core/text';
const segment = fc.stringMatching(/^[a-z0-9._-]{1,12}$/);
const userPath = fc.array(segment, { minLength: 1, maxLength: 6 }).map((parts) => `/Users/${parts.join('/')}`);
const ref = fc.oneof(
  fc.tuple(fc.constantFrom('feature', 'bugfix', ''), userPath).map(([kind, p]) => (kind ? `#[[spec:${kind}:${p}/.kiro/specs/x]]` : `#[[spec:${p}]]`)),
  userPath.map((p) => `#[[file:${p}]]`),
  fc.tuple(fc.constantFrom('steering', 'codebase', 'git', 'x'), userPath).map(([k, p]) => `#[[${k}:${p}]]`),
);
/** Plain text that holds no path of its own (any `/Users/` must come from a reference). */
const plain = fc.string({ maxLength: 20 }).filter((s) => !s.includes('/Users/') && !s.includes('/'));
const text = fc.array(fc.oneof(plain, ref), { maxLength: 6 }).map((parts) => parts.join(' '));
describe('displayRefs', () => {
  it('leaves no /Users/ behind, whole or cut at any point, and never throws', () => {
    fc.assert(
      fc.property(text, fc.nat(200), (t, cut) => {
        for (const s of [t, Array.from(t).slice(0, cut).join('')]) {
          expect(displayRefs(s)).not.toContain('/Users/');
          expect(statusParts('WORKING', false, s, false).excerpt ?? '').not.toContain('/Users/');
        }
      }),
      { numRuns: 2000 },
    );
  });
  it('does not change text without a reference', () => {
    fc.assert(fc.property(fc.string({ maxLength: 60 }).filter((s) => !s.includes('#[[')), (s) => displayRefs(s) === s));
  });
});
