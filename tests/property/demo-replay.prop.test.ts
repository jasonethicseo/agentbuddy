// The replay is deterministic (submission Requirement 2.5): for any steps no more than a second apart,
// the pings and the final list are the same as with even 250 ms steps.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { evenSteps, runDemo } from '../unit/demo-helpers';

const UNTIL = 62_000;
const reference = runDemo(evenSteps(250, UNTIL));
const strip = (p: { session: string | null; state: string }) => ({ session: p.session, state: p.state });

describe('P-demo replay determinism', () => {
  it('the same pings and the same final list for any step times', () => {
    const gaps = fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 70, maxLength: 400 });
    fc.assert(
      fc.property(gaps, (gs) => {
        const steps: number[] = [];
        let ms = 0;
        for (const g of gs) {
          ms += g;
          if (ms >= UNTIL) break;
          steps.push(ms);
        }
        while (ms < UNTIL) steps.push((ms = Math.min(UNTIL, ms + 1000)));
        const run = runDemo(steps);
        expect(run.pings.map(strip)).toEqual(reference.pings.map(strip));
        expect(run.lists.at(-1)!.views).toEqual(reference.lists.at(-1)!.views);
      }),
      { numRuns: 60 },
    );
  });
});
