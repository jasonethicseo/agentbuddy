// Buddies (agent + cwd) grouping sessions: buddy state by urgency, removal of
// old sessions, and the views sent to the UI (events.md "Buddies and sessions").
// Pure: no file system, network, timers or clock. `now` is passed in.

import { SESSION_TTL_MS } from './config';
import type { AgentId, BuddyEvent } from './event';
import { buddyKey, insertEvent, laterTask, sessionKey, stamp } from './history';
import type { Stamped } from './history';
import { displayState, foldSession, updateFirsts } from './state';
import type { DisplayState, SessionRecord } from './state';
import { displayName, shortId } from './text';

/** Most urgent first. */
export const URGENCY: readonly DisplayState[] = ['WAITING_APPROVAL', 'WORKING', 'STALE', 'TURN_DONE', 'IDLE', 'OFFLINE'];

/** Kiro spec progress; null means unknown. */
export type Progress = { done: number; total: number } | null;

export interface BuddyRecord {
  key: string;
  agent: AgentId;
  cwd: string;
  name: string;
  /** By session key. */
  sessions: ReadonlyMap<string, SessionRecord>;
  /** Latest task event of all sessions. */
  lastTask?: Stamped;
  /** Kiro only: spec path of `lastTask`. */
  specPath?: string;
}

export type BuddyList = ReadonlyMap<string, BuddyRecord>;

export interface SessionView {
  key: string;
  /** First 8 code points of the session ID. */
  session: string;
  state: DisplayState;
  statusText?: string;
  lastAt: string;
  title?: string;
  startedAt: string;
}

export interface BuddyView {
  key: string;
  agent: AgentId;
  name: string;
  cwd: string;
  state: DisplayState;
  statusText?: string;
  lastAt: string;
  /** Kiro buddies only. */
  progress?: Progress;
  /** By urgency, then latest first, then key. */
  sessions: SessionView[];
}

const rank = (s: DisplayState) => URGENCY.indexOf(s);

/** The most urgent of `states`, which must be non-empty. */
export function mostUrgent(states: readonly DisplayState[]): DisplayState {
  const first = states[0];
  if (first === undefined) throw new Error('mostUrgent: no states');
  return states.reduce((best, s) => (rank(s) < rank(best) ? s : best), first);
}

function withTask(buddy: Omit<BuddyRecord, 'lastTask' | 'specPath'>, lastTask: Stamped | undefined): BuddyRecord {
  const record: BuddyRecord = { ...buddy };
  if (lastTask === undefined) return record;
  record.lastTask = lastTask;
  const specPath = lastTask.event.task?.specPath;
  if (buddy.agent === 'kiro' && specPath !== undefined) record.specPath = specPath;
  return record;
}

/** Add one accepted event. Only the event's own session is recomputed. Returns new maps. */
export function applyEvent(
  list: BuddyList,
  event: BuddyEvent,
  seq: number,
): { list: BuddyList; buddy: string; session: string } {
  const bKey = buddyKey(event.agent, event.cwd);
  const sKey = sessionKey(event.agent, event.cwd, event.session);
  const item = stamp(event, seq);
  const old = list.get(bKey);
  const oldSession = old?.sessions.get(sKey);

  const window = insertEvent(oldSession?.window ?? [], item);
  const firsts = updateFirsts(oldSession?.firsts, item);
  const sessions = new Map(old?.sessions);
  sessions.set(sKey, { window, firsts, state: foldSession(window, firsts) });

  const base = { key: bKey, agent: event.agent, cwd: event.cwd, name: displayName(event.agent, event.cwd), sessions };
  const next = new Map(list);
  next.set(bKey, withTask(base, laterTask(old?.lastTask, item)));
  return { list: next, buddy: bKey, session: sKey };
}

/**
 * Remove sessions silent for more than 24 hours, and a buddy's latest task
 * event once it is older than that. A buddy goes only when it has neither.
 * Returns `list` itself when nothing changes.
 */
export function pruneList(list: BuddyList, nowMs: number): BuddyList {
  const alive = (atMs: number) => nowMs - atMs <= SESSION_TTL_MS;
  let changed = false;
  const next = new Map<string, BuddyRecord>();
  for (const [key, b] of list) {
    const sessions = new Map([...b.sessions].filter(([, s]) => alive(s.state.lastAtMs)));
    const lastTask = b.lastTask && alive(b.lastTask.atMs) ? b.lastTask : undefined;
    if (sessions.size === b.sessions.size && lastTask === b.lastTask) {
      next.set(key, b);
      continue;
    }
    changed = true;
    if (sessions.size === 0 && lastTask === undefined) continue;
    const { lastTask: _t, specPath: _p, ...base } = b;
    next.set(key, withTask({ ...base, sessions }, lastTask));
  }
  return changed ? next : list;
}

function compareSessions(a: SessionView & { ms: number }, b: SessionView & { ms: number }): number {
  return rank(a.state) - rank(b.state) || b.ms - a.ms || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
}

/** Buddy view at `nowMs`, or null when the buddy has no sessions left. */
export function toBuddyView(b: BuddyRecord, progress: Progress, nowMs: number): BuddyView | null {
  const sessions = [...b.sessions.values()]
    .map(({ state: s }) => {
      const view: SessionView & { ms: number } = {
        key: s.key, session: shortId(s.session), state: displayState(s, nowMs),
        lastAt: s.lastAt, startedAt: s.startedAt, ms: s.lastAtMs,
      };
      if (s.statusText !== undefined) view.statusText = s.statusText;
      if (s.title !== undefined) view.title = s.title;
      return view;
    })
    .sort(compareSessions);
  const top = sessions[0];
  if (top === undefined) return null;

  const latest = sessions.reduce((a, s) => (s.ms > a.ms ? s : a), top);
  const view: BuddyView = {
    key: b.key, agent: b.agent, name: b.name, cwd: b.cwd,
    state: mostUrgent(sessions.map((s) => s.state)),
    lastAt: latest.lastAt,
    sessions: sessions.map(({ ms: _ms, ...s }) => s),
  };
  if (top.statusText !== undefined) view.statusText = top.statusText;
  if (b.agent === 'kiro') view.progress = b.specPath === undefined ? null : progress;
  return view;
}

/** All buddies that have sessions, sorted by display name, then cwd. */
export function toViews(list: BuddyList, progress: ReadonlyMap<string, Progress>, nowMs: number): BuddyView[] {
  const order = (a: BuddyView, b: BuddyView) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : a.cwd < b.cwd ? -1 : a.cwd > b.cwd ? 1 : 0;
  return [...list.values()]
    .map((b) => toBuddyView(b, progress.get(b.key) ?? null, nowMs))
    .filter((v): v is BuddyView => v !== null)
    .sort(order);
}
