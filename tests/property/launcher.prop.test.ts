// P16: a session's launcher is the same in any arrival order, and equals its latest
// event in event order that carries a launcher field (messenger-app Requirements 1.6, 1.7).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyEvent, toViews } from '../../src/core/buddies';
import type { SessionList } from '../../src/core/buddies';
import type { BuddyEvent } from '../../src/core/event';
import { sessionKey } from '../../src/core/history';
import { BASE_MS, inEventOrder, isoAt, permutedArb } from './arbitraries';

function applyAll(events: readonly BuddyEvent[], firstSeq = 1): SessionList {
  let list: SessionList = new Map();
  events.forEach((e, i) => (list = applyEvent(list, e, firstSeq + i).list));
  return list;
}

const launchers = (list: SessionList) => new Map([...list].map(([k, s]) => [k, s.launcher?.event] as const));
const carries = (e: BuddyEvent) => e.bundleId !== undefined || e.termProgram !== undefined;

describe('P16 session launcher', () => {
  it('is the same in any arrival order and equals the latest event that carries a field', () => {
    let seen = 0;
    fc.assert(
      fc.property(permutedArb(), ([events, shuffled]) => {
        const list = applyAll(shuffled);
        expect(launchers(list)).toEqual(launchers(applyAll(inEventOrder(events))));
        for (const [key, record] of list) {
          const expected = inEventOrder(events)
            .filter((e) => sessionKey(e.agent, e.session) === key && carries(e))
            .at(-1);
          expect(record.launcher?.event).toEqual(expected);
          if (expected !== undefined) seen++;
        }
      }),
      { numRuns: 300 },
    );
    expect(seen).toBeGreaterThan(50);
  });

  it('reaches the session views unchanged in any arrival order', () => {
    const now = BASE_MS + 40 * 60_000;
    fc.assert(
      fc.property(permutedArb({}, 80), ([events, shuffled]) => {
        const pick = (list: SessionList) =>
          toViews(list, new Map(), now).flatMap((b) => b.sessions.map((s) => [s.key, s.bundleId, s.termProgram]));
        expect(pick(applyAll(shuffled))).toEqual(pick(applyAll(inEventOrder(events))));
      }),
      { numRuns: 200 },
    );
  });

  it('stays after any number of later events without a launcher', () => {
    fc.assert(
      fc.property(permutedArb({}, 60), fc.integer({ min: 0, max: 120 }), ([, shuffled], n) => {
        const before = applyAll(shuffled);
        let list = before;
        for (let i = 0; i < n; i++) {
          for (const [key, record] of before) {
            const { agent, session, cwd } = record.window.at(-1)!.event;
            const e: BuddyEvent = { v: 1, agent, session, cwd, kind: 'stop', at: isoAt(BASE_MS + 7_200_000 + i * 1000) };
            list = applyEvent(list, e, 100_000 + i * 10 + [...before.keys()].indexOf(key)).list;
          }
        }
        expect(launchers(list)).toEqual(launchers(before));
      }),
      { numRuns: 100 },
    );
  });
});
