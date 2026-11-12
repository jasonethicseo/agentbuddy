// P8: 0 <= done <= total for any tasks.md text (Requirement 11.7), plus an independent count.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parseProgress } from '../../src/core/progress';

const marker = fc.constantFrom(' ', 'x', 'X', '-', '~', '*', '😀', ']', '');
const line = fc.oneof(
  fc.tuple(fc.constantFrom('', '  ', '\t', '* ', '1. '), marker, fc.constantFrom('', '*'), fc.string({ maxLength: 20 })).map(
    ([indent, m, star, rest]) => `${indent === '* ' || indent === '1. ' ? indent.trimEnd() + ' ' : indent}${indent === '* ' || indent === '1. ' ? '' : '- '}[${m}]${star} ${rest}`,
  ),
  fc.string({ unit: 'binary', maxLength: 40 }),
);
const text = fc.tuple(fc.array(line, { maxLength: 60, size: 'max' }), fc.constantFrom('\n', '\r\n')).map(([lines, eol]) => lines.join(eol));

/** Independent count, written without the parser's regex. */
function oracle(t: string) {
  let done = 0;
  let total = 0;
  for (const l of t.split(/\r?\n/)) {
    if (!l.startsWith('- [')) continue;
    const chars = Array.from(l.slice(3));
    if (chars.length < 2 || chars[0] === ']' || chars[1] !== ']') continue;
    const isDone = chars[0] === 'x' || chars[0] === 'X';
    if (chars[2] === '*' && !isDone) continue;
    total++;
    if (isDone) done++;
  }
  return { done, total };
}

describe('P8 parseProgress', () => {
  it('gives integers with 0 <= done <= total, matching an independent count', () => {
    let withTasks = 0;
    fc.assert(
      fc.property(text, (t) => {
        const p = parseProgress(t);
        expect(Number.isInteger(p.done) && Number.isInteger(p.total)).toBe(true);
        expect(0 <= p.done && p.done <= p.total).toBe(true);
        expect(p).toEqual(oracle(t));
        if (p.total > 0) withTasks++;
      }),
      { numRuns: 1000 },
    );
    expect(withTasks).toBeGreaterThan(300); // generator sanity: real task lines are common
  });
});
