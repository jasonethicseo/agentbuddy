// fast-check generators for BuddyEvents. Only /Users/dev/... paths and short fake IDs.
import fc from 'fast-check';
import type { AgentId, BuddyEvent, EventKind } from '../../src/core/event';
import { KIND_ORDER } from '../../src/core/event';
import { buddyKey } from '../../src/core/history';

export const BASE_MS = Date.parse('2026-11-12T00:00:00.000Z');
export const KINDS: EventKind[] = ['prompt', 'task_start', 'task_done', 'permission', 'idle', 'stop'];
export const CWDS = ['/Users/dev/demo', '/Users/dev/app'];

export const isoAt = (ms: number) => new Date(ms).toISOString();

export interface EventShape {
  agent?: AgentId;
  kinds?: EventKind[];
  /** Range of minutes after BASE_MS. A small range forces `at` ties. */
  minutes?: number;
}

/** One event. Times are whole seconds so that ties on `at` are common. */
export function eventArb(shape: EventShape = {}): fc.Arbitrary<BuddyEvent> {
  const agent = shape.agent ? fc.constant(shape.agent) : fc.constantFrom<AgentId>('kiro', 'claude', 'codex');
  return fc
    .record({
      agent,
      cwd: fc.constantFrom(...CWDS),
      session: fc.constantFrom('sess_aa…', 'sess_bb…', 'e697…'),
      kind: fc.constantFrom(...(shape.kinds ?? KINDS)),
      sec: fc.integer({ min: 0, max: (shape.minutes ?? 30) * 60 }),
      text: fc.option(fc.constantFrom('hello', 'fix login', 'Done.', 'run ls'), { nil: undefined }),
      spec: fc.constantFrom('a', 'b'),
      success: fc.option(fc.boolean(), { nil: undefined }),
    })
    .map(({ agent, cwd, session, kind, sec, text, spec, success }) => {
      const e: BuddyEvent = { v: 1, agent, session, kind, at: isoAt(BASE_MS + sec * 1000), cwd };
      if (text !== undefined && kind !== 'task_start' && kind !== 'task_done') e.text = text;
      if (kind === 'task_start' || kind === 'task_done') {
        e.task = { name: `${spec}. Task`, specPath: `${cwd}/.kiro/specs/${spec}/tasks.md` };
        if (kind === 'task_done' && success !== undefined) e.task.success = success;
      }
      return e;
    });
}

/** Events with unique (buddy, at, kind), the precondition of the order properties. */
export function uniqueEventsArb(shape: EventShape = {}, maxLength = 150): fc.Arbitrary<BuddyEvent[]> {
  return fc.uniqueArray(eventArb(shape), {
    maxLength,
    size: 'max',
    selector: (e) => `${buddyKey(e.agent, e.cwd)}|${e.at}|${e.kind}`,
  });
}

/** Events plus one permutation of them. */
export function permutedArb(shape: EventShape = {}, maxLength = 150) {
  return uniqueEventsArb(shape, maxLength).chain((events) =>
    fc.tuple(fc.constant(events), fc.shuffledSubarray(events, { minLength: events.length, maxLength: events.length })),
  );
}

/** Sort by event order without arrival sequence (valid when (at, kind) is unique per buddy). */
export function inEventOrder(events: readonly BuddyEvent[]): BuddyEvent[] {
  return [...events].sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
}
