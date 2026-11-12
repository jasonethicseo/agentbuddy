// Sessions (agent + session id) grouped into buddies (agent + session folder):
// buddy state by urgency, removal of old sessions, and the views sent to the UI
// (events.md "Buddies and sessions").
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

/** All tracked sessions, by session key. Buddies are derived from it, never stored. */
export type SessionList = ReadonlyMap<string, SessionRecord>;

export interface BuddyRecord {
  key: string;
  agent: AgentId;
  /** The sessions' fixed folder. */
  cwd: string;
  name: string;
  sessions: readonly SessionRecord[];
  /** Latest task event of all its sessions. */
  lastTask?: Stamped;
  /** Kiro only: spec path of `lastTask`. */
  specPath?: string;
}

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

/** Add one accepted event to its session. Only that session is recomputed. Returns a new map. */
export function applyEvent(list: SessionList, event: BuddyEvent, seq: number): { list: SessionList; session: string; buddy: string } {
  const key = sessionKey(event.agent, event.session);
  const item = stamp(event, seq);
  const old = list.get(key);
  const window = insertEvent(old?.window ?? [], item);
  const firsts = updateFirsts(old?.firsts, item);
  const record: SessionRecord = { window, firsts, state: foldSession(window, firsts) };
  const lastTask = laterTask(old?.lastTask, item);
  if (lastTask !== undefined) record.lastTask = lastTask;
  const next = new Map(list);
  next.set(key, record);
  return { list: next, session: key, buddy: buddyKey(event.agent, record.state.folder) };
}

/** Group sessions by agent + fixed folder. Each session is in exactly one buddy. */
export function groupBuddies(list: SessionList): Map<string, BuddyRecord> {
  const buddies = new Map<string, BuddyRecord>();
  for (const s of list.values()) {
    const { agent, folder } = s.state;
    const key = buddyKey(agent, folder);
    const b = buddies.get(key) ?? { key, agent, cwd: folder, name: displayName(agent, folder), sessions: [] };
    const lastTask = s.lastTask ? laterTask(b.lastTask, s.lastTask) : b.lastTask;
    const next: BuddyRecord = { key, agent, cwd: folder, name: b.name, sessions: [...b.sessions, s] };
    if (lastTask !== undefined) {
      next.lastTask = lastTask;
      const specPath = lastTask.event.task?.specPath;
      if (agent === 'kiro' && specPath !== undefined) next.specPath = specPath;
    }
    buddies.set(key, next);
  }
  return buddies;
}

/**
 * Remove sessions silent for more than 24 hours, and drop a session's latest
 * task event once it is older than that. Returns `list` itself when nothing changes.
 */
export function pruneList(list: SessionList, nowMs: number): SessionList {
  const alive = (atMs: number) => nowMs - atMs <= SESSION_TTL_MS;
  let changed = false;
  const next = new Map<string, SessionRecord>();
  for (const [key, s] of list) {
    if (!alive(s.state.lastAtMs)) {
      changed = true;
      continue;
    }
    if (s.lastTask && !alive(s.lastTask.atMs)) {
      const { lastTask: _t, ...rest } = s;
      next.set(key, rest);
      changed = true;
      continue;
    }
    next.set(key, s);
  }
  return changed ? next : list;
}

function compareSessions(a: SessionView & { ms: number }, b: SessionView & { ms: number }): number {
  return rank(a.state) - rank(b.state) || b.ms - a.ms || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
}

/** Buddy view at `nowMs`. A buddy from `groupBuddies` always has at least one session. */
export function toBuddyView(b: BuddyRecord, progress: Progress, nowMs: number): BuddyView {
  const sessions = b.sessions
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
  if (top === undefined) throw new Error('toBuddyView: buddy without sessions');

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

/** All buddies, sorted by display name, then folder. */
export function toViews(list: SessionList, progress: ReadonlyMap<string, Progress>, nowMs: number): BuddyView[] {
  const order = (a: BuddyView, b: BuddyView) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : a.cwd < b.cwd ? -1 : a.cwd > b.cwd ? 1 : 0;
  return [...groupBuddies(list).values()].map((b) => toBuddyView(b, progress.get(b.key) ?? null, nowMs)).sort(order);
}
