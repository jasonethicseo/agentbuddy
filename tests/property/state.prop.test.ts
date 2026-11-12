// P4, P5, P6, P7, P9, P10 (Requirements 8.1–8.7, 9.7, 9.8, 9.10, 10.8).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { WINDOW_SIZE } from '../../src/core/config';
import type { BuddyEvent } from '../../src/core/event';
import { buddyKey, compareStamped, insertEvent, stamp } from '../../src/core/history';
import type { Stamped } from '../../src/core/history';
import { applyEvent, displayState, nextState } from '../../src/core/state';
import type { BuddyList, CoreState } from '../../src/core/state';
import { BASE_MS, KINDS, eventArb, inEventOrder, isoAt, permutedArb } from './arbitraries';

function applyAll(events: readonly BuddyEvent[]): BuddyList {
  let list: BuddyList = new Map();
  events.forEach((e, i) => {
    list = applyEvent(list, e, i + 1).list;
  });
  return list;
}

const states = (list: BuddyList) => new Map([...list].map(([k, r]) => [k, r.state]));
const lastTasks = (list: BuddyList) => new Map([...list].map(([k, r]) => [k, r.lastTask?.event]));

describe('P4 arrival order', () => {
  it('any permutation gives the same buddy states as event order', () => {
    fc.assert(
      fc.property(permutedArb(), ([events, shuffled]) => {
        expect(states(applyAll(shuffled))).toEqual(states(applyAll(inEventOrder(events))));
      }),
      { numRuns: 300 },
    );
  });

  it('also holds when one buddy has far more than 50 events', () => {
    fc.assert(
      fc.property(permutedArb({ agent: 'kiro', minutes: 600 }, 200), ([events, shuffled]) => {
        expect(states(applyAll(shuffled))).toEqual(states(applyAll(inEventOrder(events))));
      }),
      { numRuns: 100 },
    );
  });
});

describe('P5, P6 state entry and exit', () => {
  const prevState = fc.option(fc.constantFrom<CoreState>('WORKING', 'WAITING_APPROVAL', 'TURN_DONE', 'IDLE'), {
    nil: undefined,
  });
  const kind = fc.constantFrom(...KINDS);

  it('WAITING_APPROVAL is entered only by permission, TURN_DONE only by stop', () => {
    fc.assert(
      fc.property(fc.array(kind, { maxLength: 60 }), (kinds) => {
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

  it('the folded state equals nextState over the window', () => {
    fc.assert(
      fc.property(fc.array(eventArb({ agent: 'claude' }), { maxLength: 80, size: 'max' }), (events) => {
        const list = applyAll(events);
        for (const record of list.values()) {
          const expected = record.window.reduce<CoreState | undefined>((s, w) => nextState(s, w.event.kind), undefined);
          expect(record.state.state).toBe(expected);
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
        const all = events.map((e, i) => stamp({ ...e, cwd: '/Users/dev/demo' }, i + 1));
        for (const item of all) window = insertEvent(window, item);
        expect(window.length).toBeLessThanOrEqual(WINDOW_SIZE);
        expect(window).toEqual([...all].sort(compareStamped).slice(-WINDOW_SIZE));
      }),
    );
  });
});

describe('P9 Codex states', () => {
  it('Codex buddies show only TURN_DONE, IDLE or OFFLINE', () => {
    fc.assert(
      fc.property(
        fc.array(eventArb({ agent: 'codex', kinds: ['stop'] }), { minLength: 1, maxLength: 30 }),
        fc.integer({ min: -3_600_000, max: 4 * 3_600_000 }),
        (events, offset) => {
          for (const record of applyAll(events).values()) {
            const shown = displayState(record.state, record.state.lastAtMs + offset);
            expect(['TURN_DONE', 'IDLE', 'OFFLINE']).toContain(shown);
          }
        },
      ),
    );
  });
});

describe('P10 latest task event', () => {
  it('is the same in any arrival order and equals the maximum task event', () => {
    fc.assert(
      fc.property(permutedArb({ agent: 'kiro' }), ([events, shuffled]) => {
        const list = applyAll(shuffled);
        expect(lastTasks(list)).toEqual(lastTasks(applyAll(inEventOrder(events))));
        for (const [key, record] of list) {
          const tasks = inEventOrder(events).filter(
            (e) => buddyKey(e.agent, e.cwd) === key && (e.kind === 'task_start' || e.kind === 'task_done'),
          );
          expect(record.lastTask?.event).toEqual(tasks.at(-1));
          expect(record.state.specPath).toBe(tasks.at(-1)?.task?.specPath);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('survives any number of later non-task events', () => {
    fc.assert(
      fc.property(
        permutedArb({ agent: 'kiro', minutes: 30 }, 60),
        fc.array(eventArb({ agent: 'kiro', kinds: ['prompt', 'stop', 'idle', 'permission'] }), { maxLength: 200, size: 'max' }),
        ([, shuffled], later) => {
          const before = applyAll(shuffled);
          // Push the later events after every original one in time.
          const shifted = later.map((e) => ({ ...e, at: isoAt(Date.parse(e.at) + 3_600_000) }));
          let list = before;
          shifted.forEach((e, i) => {
            list = applyEvent(list, e, 10_000 + i).list;
          });
          for (const [key, record] of before) {
            const after = list.get(key)!;
            expect(after.lastTask).toEqual(record.lastTask);
            expect(after.state.specPath).toBe(record.state.specPath);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('needs no task event inside the window (generator sanity check)', () => {
    let evicted = 0;
    fc.assert(
      fc.property(
        fc.array(eventArb({ agent: 'kiro', kinds: ['prompt', 'stop'] }), { minLength: 60, maxLength: 120, size: 'max' }),
        (chat) => {
          const task: BuddyEvent = {
            v: 1, agent: 'kiro', session: 'sess_aa…', kind: 'task_done', at: isoAt(BASE_MS - 1000),
            cwd: '/Users/dev/demo', task: { name: '1. Task', specPath: '/Users/dev/demo/.kiro/specs/a/tasks.md' },
          };
          const list = applyAll([task, ...chat.map((e) => ({ ...e, cwd: '/Users/dev/demo' }))]);
          const record = list.get(buddyKey('kiro', '/Users/dev/demo'))!;
          if (!record.window.some((w) => w.event.kind === 'task_done')) evicted++;
          expect(record.state.specPath).toBe('/Users/dev/demo/.kiro/specs/a/tasks.md');
        },
      ),
      { numRuns: 100 },
    );
    expect(evicted).toBeGreaterThan(50);
  });
});
