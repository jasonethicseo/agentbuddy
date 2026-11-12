// Per-buddy event history: event order, the 50-event window, and the kept
// latest task event (events.md "State rules").
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

/** Event order: `at`, then kind order, then arrival sequence. */
export function compareStamped(a: Stamped, b: Stamped): number {
  return a.atMs - b.atMs || KIND_ORDER[a.event.kind] - KIND_ORDER[b.event.kind] || a.seq - b.seq;
}

/** One buddy per agent + exact cwd string. JSON keeps every pair distinct. */
export function buddyKey(agent: AgentId, cwd: string): string {
  return JSON.stringify([agent, cwd]);
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
 * not on arrival order, and never on what is still in the window.
 */
export function laterTask(kept: Stamped | undefined, item: Stamped): Stamped | undefined {
  if (!isTaskEvent(item)) return kept;
  if (kept === undefined || compareStamped(item, kept) > 0) return item;
  return kept;
}
