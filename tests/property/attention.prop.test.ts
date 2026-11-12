// P17, P18: pings. P19: the menu bar count. P20: inbox folding. P23: hidden sessions.
// P25 (inbox half): record validation (messenger-app Requirements 5.3, 8.1–8.3, 10, 11.2, 11.4, 13).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { BuddyView } from '../../src/core/buddies';
import { RANK } from '../../src/core/buddies';
import { SESSION_TTL_MS } from '../../src/core/config';
import {
  ackRecords, foldInbox, hide, isHidden, menuCount, pingRecord, refreshHidden, unackedSessions, validateInboxRecord,
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

const recordArb: fc.Arbitrary<InboxRecord> = fc.oneof(
  fc.record({ session: fc.constantFrom(...KEYS), state: fc.constantFrom<AttentionState>('WAITING_APPROVAL', 'TURN_DONE') }).map(
    ({ session, state }): InboxRecord => ({ t: 'ping', at: iso(T0), session, buddyName: 'Claude Code @ demo', startedAt: iso(T0), state }),
  ),
  fc.constantFrom(...KEYS).map((session): InboxRecord => ({ t: 'ack', at: iso(T0), session })),
);

describe('P20 inbox folding', () => {
  it('an entry is acknowledged exactly when an ack of its session comes after it', () => {
    fc.assert(
      fc.property(fc.array(recordArb, { maxLength: 60 }), (records) => {
        const entries = foldInbox(records);
        const pings = records.flatMap((r, i) => (r.t === 'ping' ? [i] : []));
        expect(entries).toHaveLength(pings.length);
        entries.forEach((e, n) => {
          const i = pings[n]!;
          expect(e.session).toBe(records[i]!.session);
          expect(e.acked).toBe(records.slice(i + 1).some((r) => r.t === 'ack' && r.session === e.session));
        });
      }),
      { numRuns: 500 },
    );
  });
});

describe('P23 hidden sessions', () => {
  it('stay hidden until the last event passes the mark; marks older than 24 hours are dropped', () => {
    const sec = fc.integer({ min: 0, max: 3 * 24 * 3600 });
    fc.assert(
      fc.property(sec, fc.integer({ min: 0, max: 3600 }), sec, fc.boolean(), (lastAt, after, later, inList) => {
        const k = KEYS[0]!;
        const hiddenAt = T0 + (lastAt + after) * 1000;
        const before = buddyView('claude', CWDS[0]!, [{ key: k, state: 'TURN_DONE', last: lastAt }]);
        const map = hide(new Map(), before.sessions[0]!, hiddenAt);
        expect(isHidden(map, before.sessions[0]!)).toBe(true);
        const next = buddyView('claude', CWDS[0]!, [{ key: k, state: 'TURN_DONE', last: later }]);
        const s = next.sessions[0]!;
        expect(isHidden(map, s)).toBe(later <= lastAt);
        const now = hiddenAt + later * 1000;
        const refreshed = refreshHidden(map, inList ? [next] : [], now);
        const gone = now - hiddenAt > SESSION_TTL_MS || (inList && later > lastAt);
        expect(refreshed.has(k)).toBe(!gone);
        expect(isHidden(refreshed, s)).toBe(!gone && later <= lastAt);
      }),
      { numRuns: 1000 },
    );
  });
});

describe('P25 inbox records', () => {
  const junk = fc.oneof(fc.string({ maxLength: 20 }), fc.jsonValue({ maxDepth: 1 }), fc.constant(''), fc.constant('x'.repeat(1025)));
  // Each field is usually right and sometimes anything, so both valid and invalid records are common.
  const mostly = <T>(good: fc.Arbitrary<T>) => fc.oneof({ weight: 6, arbitrary: good }, { weight: 1, arbitrary: junk });
  const nearRecord = fc.record(
    {
      t: mostly(fc.constantFrom('ping', 'ack')),
      at: mostly(fc.constant(iso(T0))),
      session: mostly(fc.constantFrom(...KEYS)),
      buddyName: mostly(fc.constant('Claude Code @ demo')),
      title: mostly(fc.constant('fix login')),
      startedAt: mostly(fc.constant(iso(T0))),
      state: mostly(fc.constantFrom('WAITING_APPROVAL', 'TURN_DONE')),
      extra: junk,
    },
    { requiredKeys: [] },
  );
  const allowed = { ping: ['t', 'at', 'session', 'buddyName', 'title', 'startedAt', 'state'], ack: ['t', 'at', 'session'] };
  it('never throws, and keeps only known keys of the right type', () => {
    let valid = 0;
    fc.assert(
      fc.property(fc.oneof(fc.jsonValue(), nearRecord), (value) => {
        const r = validateInboxRecord(value);
        if (r === null) return;
        valid++;
        for (const k of Object.keys(r)) expect(allowed[r.t]).toContain(k);
        for (const k of ['at', 'session'] as const) expect(typeof r[k]).toBe('string');
        if (r.t === 'ping') {
          expect(isAttention(r.state)).toBe(true);
          expect(typeof r.buddyName).toBe('string');
          if ('title' in r) expect(typeof r.title).toBe('string');
        }
        expect(validateInboxRecord(r)).toEqual(r);
        expect(validateInboxRecord(JSON.parse(JSON.stringify(r)))).toEqual(r);
      }),
      { numRuns: 2000 },
    );
    expect(valid).toBeGreaterThan(20);
  });
});
