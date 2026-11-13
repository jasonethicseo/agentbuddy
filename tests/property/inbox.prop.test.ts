// P20: inbox folding. P23: hidden sessions. P25: inbox record and settings validation
// (messenger-app Requirements 10.8, 11.2, 11.4, 13.1, 13.5, 14.3).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { SESSION_TTL_MS } from '../../src/core/config';
import { foldInbox, hide, isHidden, refreshHidden, validateInboxRecord } from '../../src/core/attention';
import type { InboxRecord } from '../../src/core/attention';
import { isAttention } from '../../src/core/pings';
import type { AttentionState } from '../../src/core/pings';
import { parseSettings, serializeSettings } from '../../src/app/settings';
import { cleanMyStatus } from '../../src/core/text';
import { T0, buddyView, iso, key } from '../fixtures/views';

const KEYS = [key('claude', 'e697…'), key('claude', '81fd…'), key('kiro', 'sess_ce19…'), key('codex', '01a1…')];
const CWDS = ['/Users/dev/demo', '/Users/dev/app'];

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

describe('P25 settings', () => {
  const near = fc.record(
    {
      hideText: fc.oneof(fc.boolean(), fc.jsonValue({ maxDepth: 1 })),
      sound: fc.oneof(fc.boolean(), fc.jsonValue({ maxDepth: 1 })),
      popups: fc.boolean(),
      macNotifications: fc.jsonValue({ maxDepth: 1 }),
      alwaysOnTop: fc.boolean(),
      closedGroups: fc.oneof(fc.array(fc.oneof(fc.constantFrom(...CWDS), fc.jsonValue({ maxDepth: 1 })), { maxLength: 5 }), fc.jsonValue({ maxDepth: 1 })),
      hidden: fc.oneof(
        fc.dictionary(fc.constantFrom(...KEYS), fc.record({ lastAt: fc.oneof(fc.constant(iso(T0)), fc.jsonValue({ maxDepth: 0 })), hiddenAt: fc.constant(iso(T0)) })),
        fc.jsonValue({ maxDepth: 2 }),
      ),
      myStatus: fc.oneof(fc.string({ maxLength: 50 }), fc.string({ unit: 'grapheme', maxLength: 45 }), fc.jsonValue({ maxDepth: 1 })),
      extra: fc.jsonValue({ maxDepth: 1 }),
    },
    { requiredKeys: [] },
  );
  const KNOWN = ['hideText', 'sound', 'popups', 'macNotifications', 'alwaysOnTop', 'closedGroups', 'myStatus', 'hidden'];
  it('never throws, and keeps only known keys of the right type', () => {
    fc.assert(
      fc.property(fc.oneof(fc.jsonValue(), near), (value) => {
        const s = parseSettings(value);
        expect(Object.keys(s).sort()).toEqual([...KNOWN].sort());
        for (const k of ['hideText', 'sound', 'popups', 'macNotifications', 'alwaysOnTop'] as const) expect(typeof s[k]).toBe('boolean');
        expect(s.closedGroups.every((g) => typeof g === 'string' && g !== '')).toBe(true);
        expect(cleanMyStatus(s.myStatus)).toBe(s.myStatus); // a clean string of at most 40 code points (Requirement 18.5)
        for (const [k, m] of s.hidden) {
          expect(typeof k).toBe('string');
          expect(Number.isFinite(m.lastAtMs) && Number.isFinite(m.hiddenAtMs)).toBe(true);
        }
        expect(parseSettings(JSON.parse(serializeSettings(s)))).toEqual(s);
      }),
      { numRuns: 1000 },
    );
  });
});
