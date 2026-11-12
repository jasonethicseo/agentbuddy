// Raw agent payload -> BuddyEvent | null, following the events.md mapping table.
// Pure: no file system, network, timers or clock. `at` is passed in.
// Never throws: every path ends in a BuddyEvent that passed validateEvent, or null.

import { isAgentId, isRecord, validateEvent } from './event';
import type { AgentId, BuddyEvent, EventKind, TaskInfo } from './event';
import { truncate } from './text';

type Payload = Record<string, unknown>;
type Normalizer = (p: Payload, at: string) => BuddyEvent | null;

export const CODEX_TITLE_PREFIX = 'Generate a concise, single-line task title';

/** Non-empty string field, or undefined. */
function str(p: Payload, key: string): string | undefined {
  const value = p[key];
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/** Truncated text field, or undefined when missing, not a string, or blank. */
function shortText(p: Payload, key: string): string | undefined {
  const value = p[key];
  if (typeof value !== 'string') return undefined;
  const text = truncate(value);
  return text === '' ? undefined : text;
}

function makeEvent(
  agent: AgentId,
  session: string,
  cwd: string,
  kind: EventKind,
  at: string,
  extra: { text?: string | undefined; task?: TaskInfo | undefined } = {},
): BuddyEvent {
  const event: BuddyEvent = { v: 1, agent, session, kind, at, cwd };
  if (extra.text !== undefined) event.text = extra.text;
  if (extra.task !== undefined) event.task = extra.task;
  return event;
}

/** Kiro task fields; null when task_name or spec_name is missing (unverified case). */
function kiroTask(p: Payload, withSuccess: boolean): TaskInfo | null {
  const name = shortText(p, 'task_name');
  const specPath = str(p, 'spec_name');
  if (name === undefined || specPath === undefined) return null;
  const success = p['task_success'];
  if (withSuccess && typeof success === 'boolean') return { name, specPath, success };
  return { name, specPath };
}

export const normalizeKiro: Normalizer = (p, at) => {
  const session = str(p, 'session_id');
  const cwd = str(p, 'cwd');
  if (session === undefined || cwd === undefined) return null;
  switch (p['hook_event_name']) {
    case 'UserPromptSubmit':
      return makeEvent('kiro', session, cwd, 'prompt', at, { text: shortText(p, 'prompt') });
    case 'PreTaskExec': {
      const task = kiroTask(p, false);
      return task && makeEvent('kiro', session, cwd, 'task_start', at, { task });
    }
    case 'PostTaskExec': {
      const task = kiroTask(p, true);
      return task && makeEvent('kiro', session, cwd, 'task_done', at, { task });
    }
    case 'Stop':
      return makeEvent('kiro', session, cwd, 'stop', at); // Kiro Stop has no text (trap 5)
    default:
      return null;
  }
};

export const normalizeClaude: Normalizer = (p, at) => {
  const session = str(p, 'session_id');
  const cwd = str(p, 'cwd');
  if (session === undefined || cwd === undefined) return null;
  switch (p['hook_event_name']) {
    case 'UserPromptSubmit':
      return makeEvent('claude', session, cwd, 'prompt', at, { text: shortText(p, 'prompt') });
    case 'Notification':
      if (p['notification_type'] === 'permission_prompt') return makeEvent('claude', session, cwd, 'permission', at);
      if (p['notification_type'] === 'idle_prompt') return makeEvent('claude', session, cwd, 'idle', at);
      return null;
    case 'Stop':
      return makeEvent('claude', session, cwd, 'stop', at, { text: shortText(p, 'last_assistant_message') });
    default:
      return null;
  }
};

/** True when `reply`, trimmed, is JSON for an object with an own `title` property. */
function isTitleReply(reply: unknown): boolean {
  if (typeof reply !== 'string') return false;
  try {
    const parsed: unknown = JSON.parse(reply.trim());
    return isRecord(parsed) && Object.hasOwn(parsed, 'title');
  } catch {
    return false;
  }
}

/** Codex hidden title turn (trap 1): either signal is enough. Only the last input message counts (trap 2). */
export function isCodexTitleTurn(p: Payload): boolean {
  const messages = p['input-messages'];
  const last: unknown = Array.isArray(messages) ? messages.at(-1) : undefined;
  if (typeof last === 'string' && last.trimStart().startsWith(CODEX_TITLE_PREFIX)) return true;
  return isTitleReply(p['last-assistant-message']);
}

export const normalizeCodex: Normalizer = (p, at) => {
  if (p['type'] !== 'agent-turn-complete') return null;
  const session = str(p, 'thread-id');
  const cwd = str(p, 'cwd');
  if (session === undefined || cwd === undefined) return null;
  if (isCodexTitleTurn(p)) return null;
  return makeEvent('codex', session, cwd, 'stop', at, { text: shortText(p, 'last-assistant-message') });
};

const NORMALIZERS: Readonly<Record<AgentId, Normalizer>> = {
  kiro: normalizeKiro,
  claude: normalizeClaude,
  codex: normalizeCodex,
};

/**
 * Parse `raw` as JSON and normalize it for `agent`. Returns a validated
 * BuddyEvent, or null for anything unparsable, unrecorded or malformed.
 */
export function normalize(agent: AgentId, raw: string, at: string): BuddyEvent | null {
  try {
    if (!isAgentId(agent) || typeof raw !== 'string') return null;
    const payload: unknown = JSON.parse(raw);
    if (!isRecord(payload)) return null;
    const event = NORMALIZERS[agent](payload, at);
    return event === null ? null : validateEvent(event);
  } catch {
    return null;
  }
}
