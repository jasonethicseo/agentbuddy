// Session state: the fold over a session's event window, time-based states,
// the session name and the session folder (events.md "State rules",
// "Buddies and sessions").
// Pure: no file system, network, timers or clock. `now` is passed in.

import { IDLE_AFTER_MS, OFFLINE_AFTER_MS, SESSION_TITLE_LIMIT } from './config';
import type { AgentId, BuddyEvent, EventKind } from './event';
import { earlier, isTaskEvent, sessionKey } from './history';
import type { Stamped } from './history';
import { truncate } from './text';

/** `ENDED`: the agent reported the session closed (Claude `SessionEnd`); shown as `OFFLINE`. */
export type CoreState = 'WORKING' | 'WAITING_APPROVAL' | 'TURN_DONE' | 'IDLE' | 'ENDED';
export type DisplayState = CoreState | 'STALE' | 'OFFLINE';

/** Earliest events of a session, kept outside its window, for its name, start time and folder. */
export interface SessionFirsts {
  first: Stamped;
  /** Earliest `prompt` that has text. */
  prompt?: Stamped;
  /** Earliest event with `firstInput` (Codex). */
  input?: Stamped;
  /** Earliest task event. */
  task?: Stamped;
  /** Earliest event with `projectDir` (Claude `CLAUDE_PROJECT_DIR`). */
  project?: Stamped;
}

export interface SessionState {
  key: string;
  agent: AgentId;
  session: string;
  /** Fixed folder: `projectDir` if the session has one, else the `cwd` of its earliest event. */
  folder: string;
  state: CoreState;
  statusText?: string;
  lastAt: string;
  lastAtMs: number;
  /** First prompt, Codex first input, or first task name; at most 40 code points. */
  title?: string;
  /** `at` of the earliest event. */
  startedAt: string;
}

export interface SessionRecord {
  window: Stamped[];
  firsts: SessionFirsts;
  state: SessionState;
  /** Latest task event of this session (running maximum). */
  lastTask?: Stamped;
  /** Latest event that carries `bundleId` or `termProgram` (running maximum). */
  launcher?: Stamped;
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
    case 'end':
      return 'ENDED';
    case 'task_done':
      return prev ?? 'WORKING';
  }
}

/** Add one event to the kept earliest events. Each is a running minimum, so arrival order never matters. */
export function updateFirsts(firsts: SessionFirsts | undefined, item: Stamped): SessionFirsts {
  const { event } = item;
  const next: SessionFirsts = { ...firsts, first: earlier(firsts?.first, item) };
  if (event.kind === 'prompt' && event.text !== undefined) next.prompt = earlier(firsts?.prompt, item);
  if (event.firstInput !== undefined) next.input = earlier(firsts?.input, item);
  if (isTaskEvent(item)) next.task = earlier(firsts?.task, item);
  if (event.projectDir !== undefined) next.project = earlier(firsts?.project, item);
  return next;
}

/** First prompt, then Codex first input, then first task name; cut to 40 code points. */
export function sessionTitle(firsts: SessionFirsts): string | undefined {
  const text = firsts.prompt?.event.text ?? firsts.input?.event.firstInput ?? firsts.task?.event.task?.name;
  return text === undefined ? undefined : truncate(text, SESSION_TITLE_LIMIT);
}

/** The session's fixed folder: its project root if reported, else where it was first seen. */
export function sessionFolder(firsts: SessionFirsts): string {
  return firsts.project?.event.projectDir ?? firsts.first.event.cwd;
}

/** Text an event contributes to the status text, if any. */
function eventText(event: BuddyEvent): string | undefined {
  return event.text ?? event.task?.name;
}

/** Recompute a session from the start of its window. `window` must be non-empty and sorted. */
export function foldSession(window: readonly Stamped[], firsts: SessionFirsts): SessionState {
  const last = window.at(-1);
  if (last === undefined) throw new Error('foldSession: empty window');

  let state: CoreState | undefined;
  let statusText: string | undefined;
  for (const { event } of window) {
    state = nextState(state, event.kind);
    statusText = eventText(event) ?? statusText;
  }

  const { agent, session } = last.event;
  const result: SessionState = {
    key: sessionKey(agent, session),
    agent,
    session,
    folder: sessionFolder(firsts),
    state: state ?? 'WORKING',
    lastAt: last.event.at,
    lastAtMs: last.atMs,
    startedAt: firsts.first.event.at,
  };
  if (statusText !== undefined) result.statusText = statusText;
  const title = sessionTitle(firsts);
  if (title !== undefined) result.title = title;
  return result;
}

/** State shown at time `nowMs`, after the 10- and 30-minute rules. */
export function displayState(s: SessionState, nowMs: number): DisplayState {
  if (s.state === 'ENDED') return 'OFFLINE';
  const age = Math.max(0, nowMs - s.lastAtMs);
  if (age >= OFFLINE_AFTER_MS) return 'OFFLINE';
  if (age >= IDLE_AFTER_MS) {
    if (s.state === 'TURN_DONE' || s.state === 'IDLE') return 'IDLE';
    return 'STALE';
  }
  return s.state;
}
