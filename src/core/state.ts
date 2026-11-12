// Buddy state: the fold over a buddy's event window, time-based states,
// and the view sent to the UI (events.md "State rules").
// Pure: no file system, network, timers or clock. `now` is passed in.

import { IDLE_AFTER_MS, OFFLINE_AFTER_MS } from './config';
import type { AgentId, BuddyEvent, EventKind } from './event';
import { buddyKey, insertEvent, laterTask, stamp } from './history';
import type { Stamped } from './history';
import { displayName, shortId } from './text';

export type CoreState = 'WORKING' | 'WAITING_APPROVAL' | 'TURN_DONE' | 'IDLE';
export type DisplayState = CoreState | 'STALE' | 'OFFLINE';

/** Kiro spec progress; null means unknown. */
export type Progress = { done: number; total: number } | null;

export interface BuddyState {
  key: string;
  agent: AgentId;
  cwd: string;
  name: string;
  state: CoreState;
  statusText?: string;
  lastAt: string;
  lastAtMs: number;
  session: string;
  /** Kiro only: spec path of the kept latest task event. */
  specPath?: string;
}

export interface BuddyRecord {
  window: Stamped[];
  lastTask?: Stamped;
  state: BuddyState;
}

export type BuddyList = ReadonlyMap<string, BuddyRecord>;

export interface BuddyView {
  key: string;
  agent: AgentId;
  name: string;
  cwd: string;
  state: DisplayState;
  statusText?: string;
  lastAt: string;
  /** First 8 code points of the latest session. */
  session: string;
  /** Kiro buddies only. */
  progress?: Progress;
}

/**
 * The whole state machine. WAITING_APPROVAL and TURN_DONE each come from one
 * kind only; idle, prompt and stop all leave WAITING_APPROVAL (trap 3).
 */
export function nextState(prev: CoreState | undefined, kind: EventKind): CoreState {
  switch (kind) {
    case 'prompt':
    case 'task_start':
      return 'WORKING';
    case 'permission':
      return 'WAITING_APPROVAL';
    case 'stop':
      return 'TURN_DONE';
    case 'idle':
      return 'IDLE';
    case 'task_done':
      return prev ?? 'WORKING';
  }
}

/** Text an event contributes to the status text, if any. */
function eventText(event: BuddyEvent): string | undefined {
  return event.text ?? event.task?.name;
}

/** Recompute a buddy from the start of its window. `window` must be non-empty and sorted. */
export function foldBuddy(window: readonly Stamped[], lastTask: Stamped | undefined): BuddyState {
  const last = window.at(-1);
  if (last === undefined) throw new Error('foldBuddy: empty window');

  let state: CoreState | undefined;
  let statusText: string | undefined;
  for (const { event } of window) {
    state = nextState(state, event.kind);
    statusText = eventText(event) ?? statusText;
  }

  const { agent, cwd } = last.event;
  const result: BuddyState = {
    key: buddyKey(agent, cwd),
    agent,
    cwd,
    name: displayName(agent, cwd),
    state: state ?? 'WORKING',
    lastAt: last.event.at,
    lastAtMs: last.atMs,
    session: last.event.session,
  };
  if (statusText !== undefined) result.statusText = statusText;
  const specPath = lastTask?.event.task?.specPath;
  if (agent === 'kiro' && specPath !== undefined) result.specPath = specPath;
  return result;
}

/** Add one accepted event. Returns a new list; the old one is not changed. */
export function applyEvent(list: BuddyList, event: BuddyEvent, seq: number): { list: BuddyList; key: string } {
  const key = buddyKey(event.agent, event.cwd);
  const old = list.get(key);
  const item = stamp(event, seq);
  const window = insertEvent(old?.window ?? [], item);
  const lastTask = laterTask(old?.lastTask, item);
  const record: BuddyRecord = { window, state: foldBuddy(window, lastTask) };
  if (lastTask !== undefined) record.lastTask = lastTask;
  const next = new Map(list);
  next.set(key, record);
  return { list: next, key };
}

/** State shown at time `nowMs`, after the 10- and 30-minute rules. */
export function displayState(b: BuddyState, nowMs: number): DisplayState {
  const age = Math.max(0, nowMs - b.lastAtMs);
  if (age >= OFFLINE_AFTER_MS) return 'OFFLINE';
  if (age >= IDLE_AFTER_MS) {
    if (b.state === 'TURN_DONE' || b.state === 'IDLE') return 'IDLE';
    return 'STALE';
  }
  return b.state;
}

export function toView(b: BuddyState, progress: Progress, nowMs: number): BuddyView {
  const view: BuddyView = {
    key: b.key,
    agent: b.agent,
    name: b.name,
    cwd: b.cwd,
    state: displayState(b, nowMs),
    lastAt: b.lastAt,
    session: shortId(b.session),
  };
  if (b.statusText !== undefined) view.statusText = b.statusText;
  if (b.agent === 'kiro') view.progress = b.specPath === undefined ? null : progress;
  return view;
}

/** All buddies, sorted by display name, then cwd. */
export function toViews(list: BuddyList, progress: ReadonlyMap<string, Progress>, nowMs: number): BuddyView[] {
  return [...list.values()]
    .map((r) => toView(r.state, progress.get(r.state.key) ?? null, nowMs))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.cwd < b.cwd ? -1 : a.cwd > b.cwd ? 1 : 0));
}
