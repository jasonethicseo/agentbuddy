// The demo scenario (`demo/events.json`): events at offsets in seconds from the moment the judge
// presses Start demo (submission Requirements 2, 3; design "Scenario format").
// Pure: no DOM, timers or clock; the start time is passed in. `parseScenario` never throws.
import { isRecord, validateEvent } from '../core/event';
import type { BuddyEvent } from '../core/event';

/** The `n/m` a `tasks.md` would give at a Kiro event (Requirement 3.4); the demo reads no file. */
export interface DemoProgress {
  done: number;
  total: number;
}

/** One scenario entry: `event` is a BuddyEvent without `v` and `at`. */
export interface ScenarioEntry {
  t: number;
  event: Omit<BuddyEvent, 'v' | 'at'>;
  progress?: DemoProgress;
}

export interface Scenario {
  entries: ScenarioEntry[];
  /** Seconds after the start at which the Replay button shows. */
  end: number;
}

/** A scenario event stamped with its time. */
export interface DemoEvent {
  t: number;
  event: BuddyEvent;
  progress?: DemoProgress;
}

const ANY_AT = '2026-01-01T00:00:00.000Z';

function parseProgress(v: unknown): DemoProgress | 'bad' | undefined {
  if (v === undefined) return undefined;
  if (!isRecord(v)) return 'bad';
  const { done, total } = v;
  const ok = Number.isInteger(done) && Number.isInteger(total) && (done as number) >= 0 && (done as number) <= (total as number);
  return ok ? { done: done as number, total: total as number } : 'bad';
}

/** The scenario, or every problem found. Entries keep their file order and must not go back in time. */
export function parseScenario(value: unknown): { ok: true; scenario: Scenario } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  try {
    if (!isRecord(value) || value['v'] !== 1 || !Array.isArray(value['events'])) return { ok: false, errors: ['not a v1 scenario with events'] };
    const end = value['end'];
    if (typeof end !== 'number' || !Number.isFinite(end)) errors.push('end is not a number');
    const entries: ScenarioEntry[] = [];
    let lastT = -Infinity;
    value['events'].forEach((item: unknown, i: number) => {
      if (!isRecord(item) || typeof item['t'] !== 'number' || !Number.isFinite(item['t'])) return void errors.push(`events[${i}]: no time`);
      const t = item['t'];
      if (t < lastT) errors.push(`events[${i}]: earlier than the entry before`);
      lastT = t;
      const event = isRecord(item['event']) ? validateEvent({ ...item['event'], v: 1, at: ANY_AT }) : null;
      if (event === null || isRecord(item['event']) && ('v' in item['event'] || 'at' in item['event'])) return void errors.push(`events[${i}]: not a valid event without v and at`);
      const progress = parseProgress(item['progress']);
      if (progress === 'bad') return void errors.push(`events[${i}]: bad progress`);
      if (progress !== undefined && event.agent !== 'kiro') return void errors.push(`events[${i}]: progress on a non-Kiro event`);
      const { v: _v, at: _at, ...rest } = event;
      entries.push(progress === undefined ? { t, event: rest } : { t, event: rest, progress });
    });
    if (typeof end === 'number' && entries.length > 0 && end < entries.at(-1)!.t) errors.push('end is before the last event');
    return errors.length > 0 ? { ok: false, errors } : { ok: true, scenario: { entries, end: end as number } };
  } catch {
    return { ok: false, errors: ['unreadable scenario'] };
  }
}

/** Every entry with `at` = start + its offset (Requirement 2.3). */
export function stampEvents(scenario: Scenario, startMs: number): DemoEvent[] {
  return scenario.entries.map(({ t, event, progress }) => {
    const stamped: DemoEvent = { t, event: { v: 1, ...event, at: new Date(startMs + t * 1000).toISOString() } };
    if (progress !== undefined) stamped.progress = progress;
    return stamped;
  });
}
