// Replay of the stamped scenario through the same core functions as the relay (submission Requirement 2.1,
// design "Replay"). Pure: the caller passes the offsets and the time.
import { applyEvent, toViews } from '../core/buddies';
import type { BuddyView, Progress, SessionList } from '../core/buddies';
import type { DemoEvent } from './scenario';

export interface ReplayState {
  list: SessionList;
  /** Kiro progress per buddy key, as the relay's progress map. */
  progress: ReadonlyMap<string, Progress>;
  /** Arrival sequence of the next event. */
  seq: number;
}

export const EMPTY: ReplayState = { list: new Map(), progress: new Map(), seq: 1 };

/** The events with `fromT < t <= toT`, in scenario order. */
export function due(events: readonly DemoEvent[], fromT: number, toT: number): DemoEvent[] {
  return events.filter((e) => e.t > fromT && e.t <= toT);
}

/** Fold events into the list; a Kiro event with progress sets its buddy's progress (Requirement 3.4). */
export function applyDue(state: ReplayState, events: readonly DemoEvent[]): ReplayState {
  let { list, seq } = state;
  const progress = new Map(state.progress);
  for (const e of events) {
    const out = applyEvent(list, e.event, seq++);
    list = out.list;
    if (e.progress !== undefined) progress.set(out.buddy, { done: e.progress.done, total: e.progress.total });
  }
  return { list, progress, seq };
}

/** The buddy list at `nowMs`, as the relay would send it. */
export function replayViews(state: ReplayState, nowMs: number): BuddyView[] {
  return toViews(state.list, state.progress, nowMs);
}

/** A new list goes out on new events, and at least this often for the time-based states (like the relay's tick). */
export const REFRESH_MS = 5000;

/**
 * The replay as the host runs it, without timers: `start` gives the baseline list (the events before the start),
 * `step(nowMs)` applies what became due and gives a new list when something changed or `REFRESH_MS` passed.
 * The host and the tests drive the same steps, so the tests see what the page shows.
 */
export function createDriver(events: readonly DemoEvent[], startMs: number) {
  let state = EMPTY;
  let lastT = 0;
  let lastListMs = startMs;
  return {
    start(): BuddyView[] {
      state = applyDue(EMPTY, events.filter((e) => e.t <= 0));
      lastT = 0;
      lastListMs = startMs;
      return replayViews(state, startMs);
    },
    step(nowMs: number): BuddyView[] | null {
      const t = (nowMs - startMs) / 1000;
      const fresh = due(events, lastT, t);
      lastT = Math.max(lastT, t);
      if (fresh.length > 0) state = applyDue(state, fresh);
      if (fresh.length === 0 && nowMs - lastListMs < REFRESH_MS) return null;
      lastListMs = nowMs;
      return replayViews(state, nowMs);
    },
  };
}
