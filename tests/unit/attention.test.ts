// Inbox records, acknowledgements and the menu bar count
// (messenger-app Requirements 5.3, 10, 11.1, 11.2, 11.4, 13.2, 13.4, 17.1). Hidden marks: hidden.test.ts.
import { describe, expect, it } from 'vitest';
import type { BuddyView } from '../../src/core/buddies';
import {
  ackRecords, foldInbox, hide, isHidden, menuCount, pingRecord, unackedSessions, validateInboxRecord,
} from '../../src/core/attention';
import type { InboxRecord } from '../../src/core/attention';
import { detectPings } from '../../src/core/pings';
import type { DisplayState } from '../../src/core/state';
import { T0, buddyView, iso, key } from '../fixtures/views';

const A = key('claude', 'e697…');
const B = key('claude', '81fd…');
const K = key('kiro', 'sess_ce19…');

const claude = (a: DisplayState, b: DisplayState): BuddyView[] => [
  buddyView('claude', '/Users/dev/demo', [{ key: A, state: a, title: 'fix login' }, { key: B, state: b }]),
];
const withKiro = (a: DisplayState, b: DisplayState, k: DisplayState) => [...claude(a, b), buddyView('kiro', '/Users/dev/app', [{ key: K, state: k }])];

/** A tiny stand-in for the app controller: lists ping, clicks acknowledge. */
function inbox() {
  let records: InboxRecord[] = [];
  let prev: BuddyView[] | null = null;
  let views: BuddyView[] = [];
  let clock = T0;
  const at = () => iso((clock += 1000));
  return {
    list(next: BuddyView[], baseline = false) {
      const pings = detectPings(baseline ? null : prev, next);
      records = [...records, ...pings.map((p) => pingRecord(p, at()))];
      prev = views = next;
    },
    ack(sessions: Iterable<string>) {
      records = [...records, ...ackRecords(foldInbox(records), sessions, at())];
    },
    get entries() {
      return foldInbox(records);
    },
    get records() {
      return records;
    },
    count: () => menuCount(views, foldInbox(records)),
  };
}

describe('foldInbox and ackRecords', () => {
  it('an ack acknowledges the earlier entries of its session only', () => {
    const r: InboxRecord[] = [
      { t: 'ping', at: iso(T0 + 1000), session: A, buddyName: 'Claude Code @ demo', startedAt: iso(T0), state: 'TURN_DONE' },
      { t: 'ping', at: iso(T0 + 2000), session: B, buddyName: 'Claude Code @ demo', startedAt: iso(T0), state: 'WAITING_APPROVAL' },
      { t: 'ack', at: iso(T0 + 3000), session: A },
      { t: 'ping', at: iso(T0 + 4000), session: A, buddyName: 'Claude Code @ demo', startedAt: iso(T0), state: 'TURN_DONE' },
    ];
    expect(foldInbox(r).map((e) => [e.session, e.acked])).toEqual([[A, true], [B, false], [A, false]]);
    expect(unackedSessions(foldInbox(r))).toEqual(new Set([B, A]));
  });

  it('adds one ack per session that still has unread entries, so repeated clicks add nothing', () => {
    const box = inbox();
    box.list(claude('WORKING', 'WORKING'));
    box.list(claude('TURN_DONE', 'TURN_DONE'));
    expect(ackRecords(box.entries, [A, A, K], iso(T0))).toEqual([{ t: 'ack', at: iso(T0), session: A }]);
    box.ack([A]);
    expect(ackRecords(box.entries, [A], iso(T0))).toEqual([]);
  });

  it('stores no status text in the inbox', () => {
    const [ping] = detectPings([], [buddyView('codex', '/Users/dev/demo', [{ key: key('codex', '01a1…'), state: 'TURN_DONE', statusText: 'Created hello.txt.' }])]);
    expect(pingRecord(ping!, iso(T0))).not.toHaveProperty('statusText');
  });
});

describe('menu bar count', () => {
  it('counts WAITING_APPROVAL sessions and unread finished turns', () => {
    const box = inbox();
    box.list(withKiro('WORKING', 'WORKING', 'WORKING'));
    box.list(withKiro('WAITING_APPROVAL', 'TURN_DONE', 'TURN_DONE'));
    expect(box.count()).toEqual({ waiting: 1, unreadTurns: 2, total: 3 });
  });

  it.each([
    ['a session row, a pop-up (Go there or ×), a jump or ×', [A]],
    ['a buddy row: every session of that buddy', [A, B]],
  ])('drops a finished turn when acknowledged through %s', (_how, sessions) => {
    const box = inbox();
    box.list(claude('WORKING', 'WORKING'));
    box.list(claude('TURN_DONE', 'TURN_DONE'));
    box.ack(sessions);
    expect(box.count().unreadTurns).toBe(2 - sessions.length);
  });

  it('Mark all read acknowledges every unread entry of today', () => {
    const box = inbox();
    box.list(withKiro('WORKING', 'WORKING', 'WORKING'));
    box.list(withKiro('WAITING_APPROVAL', 'TURN_DONE', 'TURN_DONE'));
    box.ack(unackedSessions(box.entries));
    expect(box.entries.every((e) => e.acked)).toBe(true);
    // The agent still waits, so the WAITING_APPROVAL session keeps counting.
    expect(box.count()).toEqual({ waiting: 1, unreadTurns: 0, total: 1 });
  });

  it('counts the next finished turn again after an acknowledgement', () => {
    const box = inbox();
    box.list(claude('WORKING', 'IDLE'));
    box.list(claude('TURN_DONE', 'IDLE'));
    box.ack([A]);
    expect(box.count().total).toBe(0);
    box.list(claude('WORKING', 'IDLE'));
    box.list(claude('TURN_DONE', 'IDLE'));
    expect(box.count()).toEqual({ waiting: 0, unreadTurns: 1, total: 1 });
  });

  it('does not count a TURN_DONE session that came in a baseline list', () => {
    const box = inbox();
    box.list(claude('TURN_DONE', 'TURN_DONE'), true);
    expect(box.count()).toEqual({ waiting: 0, unreadTurns: 0, total: 0 });
  });

  it('does not count a TURN_DONE session whose latest entry is a WAITING_APPROVAL ping', () => {
    const box = inbox();
    box.list(claude('WORKING', 'IDLE'));
    box.list(claude('WAITING_APPROVAL', 'IDLE')); // ping
    box.list(claude('TURN_DONE', 'IDLE'), true); // reached while disconnected: no ping
    expect(box.count().unreadTurns).toBe(0);
  });

  it('keeps counting a hidden WAITING_APPROVAL session; hiding a TURN_DONE session drops it, since hiding acknowledges', () => {
    const box = inbox();
    box.list(claude('WORKING', 'WORKING'));
    const list = claude('WAITING_APPROVAL', 'TURN_DONE');
    box.list(list);
    let hidden = hide(new Map(), list[0]!.sessions[0]!, T0);
    hidden = hide(hidden, list[0]!.sessions[1]!, T0);
    box.ack([A, B]); // what hiding does besides the mark
    expect(isHidden(hidden, list[0]!.sessions[0]!)).toBe(true);
    expect(box.count()).toEqual({ waiting: 1, unreadTurns: 0, total: 1 });
  });
});

describe('inbox file lines', () => {
  it('come back from the file after a restart with the same acknowledgements and count', () => {
    const box = inbox();
    box.list(withKiro('WORKING', 'WORKING', 'WORKING'));
    box.list(withKiro('TURN_DONE', 'TURN_DONE', 'TURN_DONE'));
    box.ack([B]);
    const text = `${box.records.map((r) => JSON.stringify(r)).join('\n')}\nnot json\n{"t":"ping","at":"2026-11-12T05:0`;
    const parsed = text.split('\n').flatMap((line) => {
      try {
        const r = validateInboxRecord(JSON.parse(line));
        return r ? [r] : [];
      } catch {
        return [];
      }
    });
    expect(parsed).toEqual(box.records);
    const views = withKiro('TURN_DONE', 'TURN_DONE', 'TURN_DONE');
    expect(menuCount(views, foldInbox(parsed))).toEqual(menuCount(views, box.entries));
    expect(menuCount(views, foldInbox(parsed)).unreadTurns).toBe(2);
  });

  it('validateInboxRecord keeps known fields only and rejects bad ones', () => {
    const ping = { t: 'ping', at: iso(T0), session: A, buddyName: 'Claude Code @ demo', title: 'fix login', startedAt: iso(T0), state: 'TURN_DONE' };
    expect(validateInboxRecord({ ...ping, statusText: 'secret', extra: 1 })).toEqual(ping);
    expect(validateInboxRecord({ t: 'ack', at: iso(T0), session: A, buddyName: 'x' })).toEqual({ t: 'ack', at: iso(T0), session: A });
    for (const bad of [
      { ...ping, t: 'pong' },
      { ...ping, at: 'yesterday' },
      { ...ping, session: '' },
      { ...ping, session: 'x'.repeat(1025) },
      { ...ping, state: 'WORKING' },
      { ...ping, title: 7 },
      { ...ping, title: '' },
      { ...ping, buddyName: undefined },
      { ...ping, startedAt: 12 },
      null,
      [ping],
      'ping',
    ]) {
      expect(validateInboxRecord(bad)).toBeNull();
    }
    const hostile = Object.defineProperty({}, 't', { get: () => { throw new Error('boom'); }, enumerable: true });
    expect(validateInboxRecord(hostile)).toBeNull();
  });
});
