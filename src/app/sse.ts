// Reading the relay's stream in the main process: a Server-Sent Events parser and a
// check that turns a `buddies` message into a clean BuddyView[] (messenger-app Requirement 4.5).
// Plain module: no Electron, no network.
import type { BuddyView, Progress, SessionView } from '../core/buddies';
import { RANK } from '../core/buddies';
import { KEY_MAX } from '../core/config';
import { isAgentId, isRecord } from '../core/event';
import { isBundleId, isTermProgram } from '../core/launcher';
import type { DisplayState } from '../core/state';

/** One message may hold at most this many characters of data; a longer one is skipped. */
export const MAX_MESSAGE_CHARS = 4 * 1024 * 1024;

export interface SseMessage {
  event: string;
  data: string;
}

/** Feed text chunks (already decoded as UTF-8); complete messages go to `onMessage`. Comments (`: ping`) are ignored. */
export function createSseParser(onMessage: (m: SseMessage) => void, maxChars = MAX_MESSAGE_CHARS) {
  let pending = '';
  let event = '';
  let data: string[] = [];
  let size = 0;
  let skipping = false;

  function line(raw: string): void {
    const l = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    if (l === '') {
      if (!skipping && data.length > 0) onMessage({ event: event || 'message', data: data.join('\n') });
      event = '';
      data = [];
      size = 0;
      skipping = false;
      return;
    }
    if (skipping || l.startsWith(':')) return;
    const colon = l.indexOf(':');
    const field = colon < 0 ? l : l.slice(0, colon);
    let value = colon < 0 ? '' : l.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') event = value;
    if (field !== 'data') return;
    size += value.length + 1;
    if (size > maxChars) {
      skipping = true;
      data = [];
      return;
    }
    data.push(value);
  }

  return {
    push(chunk: string): void {
      pending += chunk;
      let start = 0;
      let nl: number;
      while ((nl = pending.indexOf('\n', start)) >= 0) {
        line(pending.slice(start, nl));
        start = nl + 1;
      }
      pending = pending.slice(start);
      // A line that never ends must not grow without bound.
      if (pending.length > maxChars) {
        pending = '';
        skipping = true;
        data = [];
      }
    },
  };
}

const isText = (v: unknown): v is string => typeof v === 'string' && v !== '' && v.length <= KEY_MAX;
const isState = (v: unknown): v is DisplayState => typeof v === 'string' && Object.hasOwn(RANK, v);
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

function cleanSession(v: unknown): SessionView | null {
  if (!isRecord(v)) return null;
  const { key, session, state, lastAt, startedAt, statusText, title, bundleId, termProgram, task } = v;
  if (!isText(key) || !isText(session) || !isState(state) || !isText(lastAt) || !isText(startedAt)) return null;
  const s: SessionView = { key, session, state, lastAt, startedAt };
  if (isText(statusText)) s.statusText = statusText;
  if (isText(title)) s.title = title;
  if (isBundleId(bundleId)) s.bundleId = bundleId;
  if (isTermProgram(termProgram)) s.termProgram = termProgram;
  if (task === true) s.task = true;
  return s;
}

function cleanProgress(v: unknown): Progress | undefined {
  if (v === null) return null;
  if (!isRecord(v) || !isCount(v['done']) || !isCount(v['total']) || v['done'] > v['total']) return undefined;
  return { done: v['done'], total: v['total'] };
}

function cleanBuddy(v: unknown): BuddyView | null {
  if (!isRecord(v)) return null;
  const { key, agent, name, cwd, state, statusText, lastAt, progress, sessions } = v;
  if (!isText(key) || !isAgentId(agent) || !isText(name) || !isText(cwd) || !isState(state) || !isText(lastAt) || !Array.isArray(sessions)) return null;
  const clean = sessions.map(cleanSession).filter((s): s is SessionView => s !== null);
  if (clean.length === 0) return null;
  const b: BuddyView = { key, agent, name, cwd, state, lastAt, sessions: clean };
  if (isText(statusText)) b.statusText = statusText;
  if (agent === 'kiro') {
    const p = cleanProgress(progress);
    if (p !== undefined) b.progress = p;
  }
  return b;
}

/**
 * The data of a `buddies` message as a BuddyView[] built from known fields only,
 * or null when it is not JSON for an array. Malformed buddies and sessions are
 * dropped, and so is a buddy left with no session. A list from a core-pipeline
 * relay is accepted; its sessions simply have no launcher.
 */
export function parseViews(text: string): BuddyView[] | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) return null;
    return parsed.map(cleanBuddy).filter((b): b is BuddyView => b !== null);
  } catch {
    return null;
  }
}
