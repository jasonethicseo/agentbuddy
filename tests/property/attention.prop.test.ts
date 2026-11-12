// P17, P18: pings. P19: the menu bar count (messenger-app Requirements 5.3, 8.1–8.3, 10.2–10.6, 13.2, 13.4).
// P20, P23 and P25 (inbox) are in inbox.prop.test.ts.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { BuddyView } from '../../src/core/buddies';
import { RANK } from '../../src/core/buddies';
import {
  ackRecords, foldInbox, hide, menuCount, pingRecord, unackedSessions,
} from '../../src/core/attention';
import type { HiddenMap, InboxRecord } from '../../src/core/attention';
import { detectPings, isAttention } from '../../src/core/pings';
import type { AttentionState } from '../../src/core/pings';
import type { DisplayState } from '../../src/core/state';
import { T0, buddyView, iso, key } from '../fixtures/views';

const STATES = Object.keys(RANK) as DisplayState[];
const KEYS = [key('claude', 'e697…'), key('claude', '81fd…'), key('kiro', 'sess_ce19…'), key('codex', '01a1…')];
const CWDS = ['/Users/dev/demo', '/Users/dev/app'];

/** A list: some of the sessions, each with a state and a last event second, grouped into two buddies. */
const listArb: fc.Arbitrary<BuddyView[]> = fc
  .uniqueArray(fc.record({ key: fc.constantFrom(...KEYS), state: fc.constantFrom(...STATES), last: fc.integer({ min: 0, max: 600 }) }), {
    selector: (s) => s.key,
    maxLength: KEYS.length,
  })
  .map((sessions) =>
    CWDS.map((cwd, i) => buddyView(i === 0 ? 'claude' : 'kiro', cwd, sessions.filter((s) => KEYS.indexOf(s.key) % 2 === i))).filter(
      (b) => b.sessions.length > 0,
    ),
  );

const stateMap = (list: readonly BuddyView[]) => new Map(list.flatMap((b) => b.sessions.map((s) => [s.key, s.state] as const)));

describe('P17 pings between two lists', () => {
  it('none without a previous list, none for the same list twice, and each one enters an attention state', () => {
    fc.assert(
      fc.property(fc.option(listArb, { nil: null }), listArb, (prev, next) => {
        expect(detectPings(null, next)).toEqual([]);
        expect(detectPings(next, next)).toEqual([]);
        const before = prev === null ? null : stateMap(prev);
        const after = stateMap(next);
        for (const p of detectPings(prev, next)) {
          expect(isAttention(after.get(p.session))).toBe(true);
          expect(p.state).toBe(after.get(p.session));
          expect(before!.get(p.session)).not.toBe(p.state);
        }
      }),
      { numRuns: 500 },
    );
  });
});

describe('P18 pings over a sequence of lists', () => {
  it('a session pings exactly as often as its state changes into an attention state after the first list', () => {
    let pinged = 0;
    fc.assert(
      fc.property(fc.array(listArb, { minLength: 1, maxLength: 12 }), (lists) => {
        const got = new Map<string, number>();
        for (let i = 1; i < lists.length; i++) for (const p of detectPings(lists[i - 1]!, lists[i]!)) got.set(p.session, (got.get(p.session) ?? 0) + 1);
        for (const k of KEYS) {
          const seq = lists.map((l) => stateMap(l).get(k));
          let want = 0;
          for (let i = 1; i < seq.length; i++) if (isAttention(seq[i]) && seq[i] !== seq[i - 1]) want++;
          expect(got.get(k) ?? 0).toBe(want);
          pinged += want;
        }
      }),
      { numRuns: 400 },
    );
    expect(pinged).toBeGreaterThan(200);
  });
});

type Op = { kind: 'list' | 'baseline'; list: BuddyView[] } | { kind: 'ack' | 'hide'; session: string } | { kind: 'ackAll' };
const opArb: fc.Arbitrary<Op> = fc.oneof(
  { weight: 4, arbitrary: listArb.map((list) => ({ kind: 'list' as const, list })) },
  { weight: 1, arbitrary: listArb.map((list) => ({ kind: 'baseline' as const, list })) },
  { weight: 2, arbitrary: fc.constantFrom(...KEYS).map((session) => ({ kind: 'ack' as const, session })) },
  { weight: 1, arbitrary: fc.constantFrom(...KEYS).map((session) => ({ kind: 'hide' as const, session })) },
  { weight: 1, arbitrary: fc.constant({ kind: 'ackAll' as const }) },
);

describe('P19 menu bar count', () => {
  it('equals WAITING_APPROVAL sessions plus finished turns not acknowledged since their last ping', () => {
    let unreadSeen = 0;
    fc.assert(
      fc.property(fc.array(opArb, { maxLength: 40 }), (ops) => {
        let records: InboxRecord[] = [];
        let prev: BuddyView[] | null = null;
        let views: BuddyView[] = [];
        let hidden: HiddenMap = new Map();
        let clock = T0;
        // Reference model: per session, the state of its last ping and whether it is unread.
        const model = new Map<string, { state: AttentionState; unread: boolean }>();
        const ack = (sessions: Iterable<string>) => {
          const list = [...sessions];
          records = [...records, ...ackRecords(foldInbox(records), list, iso((clock += 1000)))];
          for (const s of list) {
            const m = model.get(s);
            if (m) m.unread = false;
          }
        };
        for (const op of ops) {
          if (op.kind === 'list' || op.kind === 'baseline') {
            const pings = detectPings(op.kind === 'baseline' ? null : prev, op.list);
            records = [...records, ...pings.map((p) => pingRecord(p, iso((clock += 1000))))];
            for (const p of pings) model.set(p.session, { state: p.state, unread: true });
            prev = views = op.list;
          } else if (op.kind === 'ack') {
            ack([op.session]);
          } else if (op.kind === 'hide') {
            const s = views.flatMap((b) => b.sessions).find((x) => x.key === op.session);
            if (s === undefined) continue;
            hidden = hide(hidden, s, clock);
            ack([op.session]); // hiding acknowledges (Requirement 13.2)
          } else {
            ack(unackedSessions(foldInbox(records)));
          }
          const sessions = views.flatMap((b) => b.sessions);
          const waiting = sessions.filter((s) => s.state === 'WAITING_APPROVAL').length;
          const unreadTurns = sessions.filter((s) => {
            const m = model.get(s.key);
            return s.state === 'TURN_DONE' && m?.unread === true && m.state === 'TURN_DONE';
          }).length;
          const count = menuCount(views, foldInbox(records));
          expect(count).toEqual({ waiting, unreadTurns, total: waiting + unreadTurns });
          expect(count.total).toBeGreaterThanOrEqual(0);
          unreadSeen += unreadTurns;
        }
        void hidden;
      }),
      { numRuns: 400 },
    );
    expect(unreadSeen).toBeGreaterThan(100);
  });
});
