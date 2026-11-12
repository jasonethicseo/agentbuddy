// BuddyEvent: the one event shape shared by the hook, relay and UI (events.md).
// Pure: no file system, network, timers or clock.

import { TEXT_LIMIT } from './config';
import { codePointLength } from './text';

export type AgentId = 'kiro' | 'claude' | 'codex';
export type EventKind = 'prompt' | 'task_start' | 'task_done' | 'permission' | 'idle' | 'stop';

export interface TaskInfo {
  name: string;
  specPath: string;
  success?: boolean;
}

export interface BuddyEvent {
  v: 1;
  agent: AgentId;
  session: string;
  kind: EventKind;
  at: string;
  cwd: string;
  text?: string;
  task?: TaskInfo;
}

export const AGENTS: readonly AgentId[] = ['kiro', 'claude', 'codex'];
export const KINDS: readonly EventKind[] = ['prompt', 'task_start', 'task_done', 'permission', 'idle', 'stop'];

/** Tie-break order for events of one buddy with the same `at` (events.md). */
export const KIND_ORDER: Readonly<Record<EventKind, number>> = {
  prompt: 0,
  task_start: 1,
  permission: 2,
  task_done: 3,
  stop: 4,
  idle: 5,
};

const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isAgentId(value: unknown): value is AgentId {
  return typeof value === 'string' && (AGENTS as readonly string[]).includes(value);
}

function isKind(value: unknown): value is EventKind {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value !== '';
}

function isShortText(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  return codePointLength(value) <= TEXT_LIMIT;
}

/** True for an ISO 8601 date-time with an explicit offset that `Date.parse` accepts. */
export function isIsoTime(value: unknown): value is string {
  return typeof value === 'string' && ISO_TIME.test(value) && Number.isFinite(Date.parse(value));
}

function validateTask(value: unknown): TaskInfo | null {
  if (!isRecord(value)) return null;
  const { name, specPath, success } = value;
  if (!isShortText(name) || !isNonEmptyString(specPath)) return null;
  if (success !== undefined && typeof success !== 'boolean') return null;
  return success === undefined ? { name, specPath } : { name, specPath, success };
}

/**
 * Returns a new, valid `BuddyEvent` built from the known fields of `value`,
 * or `null`. Never throws. Unknown properties are left out, and `task` is
 * kept only for `task_start` and `task_done`.
 */
export function validateEvent(value: unknown): BuddyEvent | null {
  try {
    if (!isRecord(value)) return null;
    const { v, agent, session, kind, at, cwd, text, task } = value;
    if (v !== 1 || !isAgentId(agent) || !isKind(kind)) return null;
    if (!isNonEmptyString(session) || !isNonEmptyString(cwd) || !isIsoTime(at)) return null;
    if (text !== undefined && !isShortText(text)) return null;

    const event: BuddyEvent = { v: 1, agent, session, kind, at, cwd };
    if (text !== undefined) event.text = text;

    if (kind === 'task_start' || kind === 'task_done') {
      const checked = validateTask(task);
      if (checked === null) return null;
      event.task = checked;
    }
    return event;
  } catch {
    return null;
  }
}
