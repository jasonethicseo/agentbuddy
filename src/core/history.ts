// Event order, per-session event windows, and kept earliest/latest events
// (events.md "State rules").
// Pure: no file system, network, timers or clock. Arrival sequence is passed in.

import { WINDOW_SIZE } from './config';
import { KIND_ORDER } from './event';
import type { AgentId, BuddyEvent } from './event';

/** An accepted event with its arrival sequence and parsed time. */
export interface Stamped {
  event: BuddyEvent;
  seq: number;
  atMs: number;
}

/** `atMs` comes from `Date.parse`, which reads no clock. */
export function stamp(event: BuddyEvent, seq: number): Stamped {
  return { event, seq, atMs: Date.parse(event.at) };
}

/**
 * Event order: `at`, then kind order, then `session`, then arrival sequence.
 * Comparing `session` before `seq` makes cross-session ties independent of
 * arrival order; within one session only `seq` can break a full tie.
 */
export function compareStamped(a: Stamped, b: Stamped): number {
  const bySession = a.event.session < b.event.session ? -1 : a.event.session > b.event.session ? 1 : 0;
  return a.atMs - b.atMs || KIND_ORDER[a.event.kind] - KIND_ORDER[b.event.kind] || bySession || a.seq - b.seq;
}

/** One buddy per agent + exact cwd string. JSON keeps every pair distinct. */
export function buddyKey(agent: AgentId, cwd: string): string {
  return JSON.stringify([agent, cwd]);
}

/** One session per agent + exact cwd + session id. */
export function sessionKey(agent: AgentId, cwd: string, session: string): string {
  return JSON.stringify([agent, cwd, session]);
}

/**
 * New window with `item` in its place in event order, keeping the latest
 * `cap` events. An item older than all kept events is cut off at once.
 */
export function insertEvent(window: readonly Stamped[], item: Stamped, cap: number = WINDOW_SIZE): Stamped[] {
  return [...window, item].sort(compareStamped).slice(-cap);
}

export function isTaskEvent(item: Stamped): boolean {
  return item.event.kind === 'task_start' || item.event.kind === 'task_done';
}

/**
 * Running maximum of task events in event order. Only a later task event
 * replaces the kept one, so the result depends on the set of task events,
 * not on arrival order, and never on what is still in a window.
 */
export function laterTask(kept: Stamped | undefined, item: Stamped): Stamped | undefined {
  if (!isTaskEvent(item)) return kept;
  if (kept === undefined || compareStamped(item, kept) > 0) return item;
  return kept;
}

/** Running minimum in event order: the earlier of `kept` and `item`. */
export function earlier(kept: Stamped | undefined, item: Stamped): Stamped {
  return kept === undefined || compareStamped(item, kept) < 0 ? item : kept;
}
