// Helpers for the core state tests: events of one Kiro session by default, applied in order.
import { applyEvent, groupBuddies, toBuddyView } from '../../src/core/buddies';
import type { BuddyRecord, BuddyView, SessionList } from '../../src/core/buddies';
import type { AgentId, BuddyEvent, EventKind } from '../../src/core/event';
import { buddyKey } from '../../src/core/history';

export const T0 = Date.parse('2026-11-12T01:00:00.000Z');
export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const at = (minute: number) => new Date(T0 + minute * MIN).toISOString();
export const SPEC = '/Users/dev/demo/.kiro/specs/hello-file/tasks.md';

export function ev(kind: EventKind, minute: number, extra: Partial<BuddyEvent> = {}): BuddyEvent {
  const e: BuddyEvent = { v: 1, agent: 'kiro', session: 'sess_ce19…', kind, at: at(minute), cwd: '/Users/dev/demo', ...extra };
  if ((kind === 'task_start' || kind === 'task_done') && !e.task) e.task = { name: '2. Change the line in hello.txt', specPath: SPEC };
  return e;
}

export function run(events: BuddyEvent[]): SessionList {
  let list: SessionList = new Map();
  events.forEach((e, i) => (list = applyEvent(list, e, i + 1).list));
  return list;
}

export function buddy(list: SessionList, agent: AgentId = 'kiro', cwd = '/Users/dev/demo'): BuddyRecord {
  return groupBuddies(list).get(buddyKey(agent, cwd))!;
}

export function view(list: SessionList, nowMs = T0, agent: AgentId = 'kiro', cwd = '/Users/dev/demo'): BuddyView {
  return toBuddyView(buddy(list, agent, cwd), null, nowMs);
}
