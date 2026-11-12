// Inbox records, acknowledgements, the menu bar count and hidden sessions
// (messenger-app Requirements 5.3, 10, 11.1, 11.2, 13).
// Pure: no file system, network, timers or clock. Times are passed in.
import type { BuddyView, SessionView } from './buddies';
import { KEY_MAX, SESSION_TTL_MS } from './config';
import { isIsoTime, isRecord } from './event';
import { isAttention } from './pings';
import type { AttentionState, Ping } from './pings';

/** One line of `inbox-YYYY-MM-DD.jsonl`. The file is only appended to, so it is its own history. */
export interface PingRecord {
  t: 'ping';
  /** When the app found the ping. */
  at: string;
  session: string;
  buddyName: string;
  title?: string;
  startedAt: string;
  state: AttentionState;
}
export interface AckRecord {
  t: 'ack';
  at: string;
  session: string;
}
export type InboxRecord = PingRecord | AckRecord;

export interface InboxEntry {
  at: string;
  session: string;
  buddyName: string;
  title?: string;
  startedAt: string;
  state: AttentionState;
  acked: boolean;
}

export interface MenuCount {
  /** Sessions in WAITING_APPROVAL, acknowledged or not, hidden or not. */
  waiting: number;
  /** TURN_DONE sessions whose latest entry is an unacknowledged TURN_DONE entry. */
  unreadTurns: number;
  total: number;
}

const isField = (v: unknown): v is string => typeof v === 'string' && v !== '' && v.length <= KEY_MAX;

/** A valid record built from the known fields of `value`, or null. Never throws. */
export function validateInboxRecord(value: unknown): InboxRecord | null {
  try {
    if (!isRecord(value)) return null;
    const { t, at, session } = value;
    if (!isIsoTime(at) || !isField(session)) return null;
    if (t === 'ack') return { t, at, session };
    if (t !== 'ping') return null;
    const { buddyName, title, startedAt, state } = value;
    if (!isField(buddyName) || !isIsoTime(startedAt) || !isAttention(state)) return null;
    if (title !== undefined && !isField(title)) return null;
    const record: PingRecord = { t, at, session, buddyName, startedAt, state };
    if (title !== undefined) record.title = title;
    return record;
  } catch {
    return null;
  }
}

/** The record to append for a ping found at `at`. Status text is never stored. */
export function pingRecord(ping: Ping, at: string): PingRecord {
  const record: PingRecord = { t: 'ping', at, session: ping.session, buddyName: ping.buddyName, startedAt: ping.startedAt, state: ping.state };
  if (ping.title !== undefined) record.title = ping.title;
  return record;
}

/** Entries in record order. An `ack` acknowledges every earlier entry of its session. */
export function foldInbox(records: readonly InboxRecord[]): InboxEntry[] {
  const entries: InboxEntry[] = [];
  const open = new Map<string, InboxEntry[]>();
  for (const r of records) {
    if (r.t === 'ack') {
      for (const e of open.get(r.session) ?? []) e.acked = true;
      open.delete(r.session);
      continue;
    }
    const entry: InboxEntry = { at: r.at, session: r.session, buddyName: r.buddyName, startedAt: r.startedAt, state: r.state, acked: false };
    if (r.title !== undefined) entry.title = r.title;
    entries.push(entry);
    open.set(r.session, [...(open.get(r.session) ?? []), entry]);
  }
  return entries;
}

/** Sessions with an unacknowledged entry (the same as: whose latest entry is unacknowledged). */
export function unackedSessions(entries: readonly InboxEntry[]): Set<string> {
  const out = new Set<string>();
  for (const e of entries) if (!e.acked) out.add(e.session);
  return out;
}

/** One `ack` per given session that still has an unacknowledged entry, so repeated clicks add nothing. */
export function ackRecords(entries: readonly InboxEntry[], sessions: Iterable<string>, at: string): AckRecord[] {
  const open = unackedSessions(entries);
  const out: AckRecord[] = [];
  for (const session of sessions) {
    if (!open.has(session)) continue;
    open.delete(session);
    out.push({ t: 'ack', at, session });
  }
  return out;
}

/** The menu bar count: WAITING_APPROVAL sessions plus unacknowledged finished turns (Requirements 5.3, 10.5, 10.6). */
export function menuCount(views: readonly BuddyView[], entries: readonly InboxEntry[]): MenuCount {
  const latest = new Map<string, InboxEntry>();
  for (const e of entries) latest.set(e.session, e);
  const seen = new Set<string>();
  let waiting = 0;
  let unreadTurns = 0;
  for (const b of views) {
    for (const s of b.sessions) {
      if (seen.has(s.key)) continue;
      seen.add(s.key);
      if (s.state === 'WAITING_APPROVAL') waiting++;
      if (s.state !== 'TURN_DONE') continue;
      const e = latest.get(s.key);
      if (e !== undefined && e.state === 'TURN_DONE' && !e.acked) unreadTurns++;
    }
  }
  return { waiting, unreadTurns, total: waiting + unreadTurns };
}

/** A session hidden with ×: its last event time at the click, and when it was hidden. */
export interface HiddenMark {
  lastAtMs: number;
  hiddenAtMs: number;
}
export type HiddenMap = ReadonlyMap<string, HiddenMark>;

/** Hide `session` until it has an event later than its last event time now (Requirement 13.1). */
export function hide(map: HiddenMap, session: SessionView, nowMs: number): HiddenMap {
  return new Map(map).set(session.key, { lastAtMs: Date.parse(session.lastAt), hiddenAtMs: nowMs });
}

export function isHidden(map: HiddenMap, session: SessionView): boolean {
  const mark = map.get(session.key);
  return mark !== undefined && Date.parse(session.lastAt) <= mark.lastAtMs;
}

/**
 * Drops marks whose session has a later event, and marks older than 24 hours
 * (Requirement 13.5). A mark whose session is not in the list is kept until
 * then, so a relay restart does not unhide everything. Returns `map` itself
 * when nothing changes.
 */
export function refreshHidden(map: HiddenMap, views: readonly BuddyView[], nowMs: number): HiddenMap {
  const lastAt = new Map<string, number>();
  for (const b of views) for (const s of b.sessions) lastAt.set(s.key, Date.parse(s.lastAt));
  let changed = false;
  const next = new Map<string, HiddenMark>();
  for (const [key, mark] of map) {
    const at = lastAt.get(key);
    if (nowMs - mark.hiddenAtMs > SESSION_TTL_MS || (at !== undefined && at > mark.lastAtMs)) {
      changed = true;
      continue;
    }
    next.set(key, mark);
  }
  return changed ? next : map;
}
