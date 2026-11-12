// P4–P7, P9–P13 (Requirements 8, 9.7, 9.8, 9.10, 10.8, 22, 23).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { SESSION_TTL_MS, WINDOW_SIZE } from '../../src/core/config';
import { URGENCY, applyEvent, mostUrgent, pruneList, toBuddyView, toViews } from '../../src/core/buddies';
import type { BuddyList } from '../../src/core/buddies';
import type { BuddyEvent } from '../../src/core/event';
import { buddyKey, compareStamped, insertEvent, stamp } from '../../src/core/history';
import type { Stamped } from '../../src/core/history';
import { displayState, nextState } from '../../src/core/state';
import type { CoreState, DisplayState } from '../../src/core/state';
import { BASE_MS, KINDS, eventArb, inEventOrder, isoAt, permutedArb } from './arbitraries';

function applyAll(events: readonly BuddyEvent[], firstSeq = 1): BuddyList {
  let list: BuddyList = new Map();
  events.forEach((e, i) => (list = applyEvent(list, e, firstSeq + i).list));
  return list;
}

const NOW = BASE_MS + 40 * 60_000; // past the 10-minute rule for early events
const sessionStates = (list: BuddyList) =>
  new Map([...list.values()].flatMap((b) => [...b.sessions].map(([k, s]) => [k, s.state] as const)));
const lastTasks = (list: BuddyList) => new Map([...list].map(([k, b]) => [k, [b.lastTask?.event, b.specPath]]));
const snapshot = (list: BuddyList) => ({ sessions: sessionStates(list), tasks: lastTasks(list), views: toViews(list, new Map(), NOW) });
const rank = (s: DisplayState) => URGENCY.indexOf(s);

describe('P4 arrival order', () => {
  it('any permutation gives the same session states and buddy views as event order', () => {
    fc.assert(
      fc.property(permutedArb(), ([events, shuffled]) => {
        expect(snapshot(applyAll(shuffled))).toEqual(snapshot(applyAll(inEventOrder(events))));
      }),
      { numRuns: 300 },
    );
  });

  it('also holds when one session has far more than 50 events', () => {
    const shape = { agent: 'kiro' as const, minutes: 600, cwds: ['/Users/dev/demo'], sessions: ['sess_aa…', 'sess_bb…'] };
    fc.assert(
      fc.property(permutedArb(shape, 200), ([events, shuffled]) => {
        expect(snapshot(applyAll(shuffled))).toEqual(snapshot(applyAll(inEventOrder(events))));
      }),
      { numRuns: 100 },
    );
  });
});

describe('P5, P6 state entry and exit', () => {
  const prevState = fc.option(fc.constantFrom<CoreState>('WORKING', 'WAITING_APPROVAL', 'TURN_DONE', 'IDLE'), { nil: undefined });

  it('WAITING_APPROVAL is entered only by permission, TURN_DONE only by stop', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...KINDS), { maxLength: 60 }), (kinds) => {
        let s: CoreState | undefined;
        for (const k of kinds) {
          const next = nextState(s, k);
          if (next === 'WAITING_APPROVAL' && s !== 'WAITING_APPROVAL') expect(k).toBe('permission');
          if (next === 'TURN_DONE' && s !== 'TURN_DONE') expect(k).toBe('stop');
          s = next;
        }
      }),
    );
  });

  it('idle, prompt and stop always leave WAITING_APPROVAL', () => {
    fc.assert(
      fc.property(prevState, fc.constantFrom('idle', 'prompt', 'stop') as fc.Arbitrary<'idle' | 'prompt' | 'stop'>, (prev, k) => {
        const waiting = nextState(prev, 'permission');
        expect(waiting).toBe('WAITING_APPROVAL');
        expect(nextState(waiting, k)).not.toBe('WAITING_APPROVAL');
      }),
    );
  });

  it('each session state equals nextState over its own window', () => {
    fc.assert(
      fc.property(fc.array(eventArb({ agent: 'claude' }), { maxLength: 80, size: 'max' }), (events) => {
        for (const b of applyAll(events).values()) {
          for (const s of b.sessions.values()) {
            const expected = s.window.reduce<CoreState | undefined>((st, w) => nextState(st, w.event.kind), undefined);
            expect(s.state.state).toBe(expected);
            expect(new Set(s.window.map((w) => w.event.session)).size).toBe(1);
          }
        }
      }),
    );
  });
});

describe('P7 window', () => {
  it('keeps the last 50 of all inserted events in event order', () => {
    fc.assert(
      fc.property(fc.array(eventArb({ agent: 'kiro', minutes: 5 }), { maxLength: 200, size: 'max' }), (events) => {
        let window: Stamped[] = [];
        const all = events.map((e, i) => stamp({ ...e, cwd: '/Users/dev/demo', session: 'sess_aa…' }, i + 1));
        for (const item of all) window = insertEvent(window, item);
        expect(window.length).toBeLessThanOrEqual(WINDOW_SIZE);
        expect(window).toEqual([...all].sort(compareStamped).slice(-WINDOW_SIZE));
      }),
    );
  });
});

describe('P9 Codex states', () => {
  it('Codex sessions show only TURN_DONE, IDLE or OFFLINE', () => {
    fc.assert(
      fc.property(
        fc.array(eventArb({ agent: 'codex', kinds: ['stop'] }), { minLength: 1, maxLength: 30 }),
        fc.integer({ min: -3_600_000, max: 4 * 3_600_000 }),
        (events, offset) => {
          for (const b of applyAll(events).values()) {
            for (const s of b.sessions.values()) {
              expect(['TURN_DONE', 'IDLE', 'OFFLINE']).toContain(displayState(s.state, s.state.lastAtMs + offset));
            }
          }
        },
      ),
    );
  });
});

describe('P10 latest task event per buddy', () => {
  it('is the same in any arrival order and equals the maximum task event of all sessions', () => {
    fc.assert(
      fc.property(permutedArb({ agent: 'kiro' }), ([events, shuffled]) => {
        const list = applyAll(shuffled);
        expect(lastTasks(list)).toEqual(lastTasks(applyAll(inEventOrder(events))));
        for (const [key, b] of list) {
          const tasks = inEventOrder(events).filter(
            (e) => buddyKey(e.agent, e.cwd) === key && (e.kind === 'task_start' || e.kind === 'task_done'),
          );
          expect(b.lastTask?.event).toEqual(tasks.at(-1));
          expect(b.specPath).toBe(tasks.at(-1)?.task?.specPath);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('survives any number of later non-task events, in any session', () => {
    fc.assert(
      fc.property(
        permutedArb({ agent: 'kiro', minutes: 30 }, 60),
        fc.array(eventArb({ agent: 'kiro', kinds: ['prompt', 'stop', 'idle', 'permission'] }), { maxLength: 200, size: 'max' }),
        ([, shuffled], later) => {
          const before = applyAll(shuffled);
          const shifted = later.map((e) => ({ ...e, at: isoAt(Date.parse(e.at) + 3_600_000) }));
          let list = before;
          shifted.forEach((e, i) => (list = applyEvent(list, e, 10_000 + i).list));
          for (const [key, b] of before) {
            expect(list.get(key)!.lastTask).toEqual(b.lastTask);
            expect(list.get(key)!.specPath).toBe(b.specPath);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('P11 buddy state from sessions', () => {
  it('mostUrgent picks one of its inputs, and none is more urgent', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...URGENCY), { minLength: 1, maxLength: 10 }), (states) => {
        const best = mostUrgent(states);
        expect(states).toContain(best);
        for (const s of states) expect(rank(s)).toBeGreaterThanOrEqual(rank(best));
      }),
    );
  });

  it('a buddy state is one of its session states, and no session is more urgent', () => {
    fc.assert(
      fc.property(fc.array(eventArb(), { maxLength: 120, size: 'max' }), fc.integer({ min: 0, max: 3 * 3_600_000 }), (events, offset) => {
        for (const v of toViews(applyAll(events), new Map(), BASE_MS + offset)) {
          const states = v.sessions.map((s) => s.state);
          expect(states).toContain(v.state);
          for (const s of states) expect(rank(s)).toBeGreaterThanOrEqual(rank(v.state));
          expect(v.sessions[0]!.state).toBe(v.state);
        }
      }),
    );
  });
});

describe('P12 removal of old sessions', () => {
  const spread = fc.array(eventArb({ minutes: 48 * 60 }), { maxLength: 120, size: 'max' });
  const nowArb = fc.integer({ min: 0, max: 72 * 3_600_000 }).map((ms) => BASE_MS + ms);

  it('leaves remaining sessions and buddy states unchanged, and removes only what is older than 24 h', () => {
    let removed = 0;
    let kept = 0;
    fc.assert(
      fc.property(spread, nowArb, (events, now) => {
        const list = applyAll(events);
        const pruned = pruneList(list, now);
        for (const [key, b] of list) {
          const after = pruned.get(key);
          const before = toBuddyView(b, null, now)!;
          if (after === undefined) {
            for (const s of b.sessions.values()) expect(now - s.state.lastAtMs).toBeGreaterThan(SESSION_TTL_MS);
            removed += b.sessions.size;
            continue;
          }
          for (const [sk, s] of b.sessions) {
            const alive = now - s.state.lastAtMs <= SESSION_TTL_MS;
            expect(after.sessions.has(sk)).toBe(alive);
            if (alive) expect(after.sessions.get(sk)!.state).toEqual(s.state);
            alive ? kept++ : removed++;
          }
          const view = toBuddyView(after, null, now);
          if (view === null) continue; // only a still-fresh latest task event is left
          const keptKeys = new Set(after.sessions.keys());
          expect(view).toEqual({ ...before, sessions: before.sessions.filter((s) => keptKeys.has(s.key)) });
        }
      }),
      { numRuns: 300 },
    );
    expect(removed).toBeGreaterThan(100); // generator sanity: both branches are exercised
    expect(kept).toBeGreaterThan(100);
  });
});

describe('P13 session names', () => {
  it('title and start time are the same in any arrival order', () => {
    fc.assert(
      fc.property(permutedArb({}, 120), ([events, shuffled]) => {
        const names = (list: BuddyList) =>
          [...sessionStates(list)].map(([k, s]) => [k, s.title, s.startedAt]).sort();
        expect(names(applyAll(shuffled))).toEqual(names(applyAll(inEventOrder(events))));
      }),
      { numRuns: 300 },
    );
  });
});
