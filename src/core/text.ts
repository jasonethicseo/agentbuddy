// Text helpers: truncation, code point counting and buddy names.
// Pure: no file system, network, timers or clock.

import { KEY_MAX, MY_STATUS_LIMIT, STATUS_TEXT_LIMIT, TEXT_LIMIT } from './config';
import type { AgentId } from './event';
import type { DisplayState } from './state';

const ELLIPSIS = '\u2026';

/** Number of Unicode code points. A lone surrogate counts as one. */
export function codePointLength(s: string): number {
  let n = 0;
  for (const _ of s) n++;
  return n;
}

/**
 * Collapse every whitespace run to one space, trim both ends, and cut to at
 * most `limit` code points. A cut keeps the first `limit - 1` code points
 * (trailing space removed) and appends `…`. Surrogate pairs are never split,
 * because the string is split by code point.
 */
export function truncate(input: string, limit: number = TEXT_LIMIT): string {
  const collapsed = input.replace(/\s+/gu, ' ').trim();
  if (collapsed.length <= limit) return collapsed; // UTF-16 length >= code points
  const points = Array.from(collapsed);
  if (points.length <= limit) return collapsed;
  return points.slice(0, limit - 1).join('').trimEnd() + ELLIPSIS;
}

export const AGENT_NAMES: Readonly<Record<AgentId, string>> = {
  kiro: 'Kiro',
  claude: 'Claude Code',
  codex: 'Codex',
};

/** Last non-empty `/` segment of `cwd`, or `cwd` itself when there is none. */
export function folderName(cwd: string): string {
  const segments = cwd.split('/').filter((s) => s !== '');
  return segments.at(-1) ?? cwd;
}

/** `<Agent> @ <folder name>`, for example `Kiro @ demo`. */
export function displayName(agent: AgentId, cwd: string): string {
  return `${AGENT_NAMES[agent]} @ ${folderName(cwd)}`;
}

/** First 8 code points of a session ID, for display. */
export function shortId(session: string): string {
  return Array.from(session).slice(0, 8).join('');
}

/**
 * Messenger phrase per displayed state (messenger-app Requirement 7.2, design.md). The WORKING
 * phrases carry no glyph: the screen draws the theme's `▸` or `♪` before them (themes T3, T14).
 */
export const PHRASES: Readonly<Record<DisplayState, string>> = {
  WAITING_APPROVAL: 'need your OK T_T',
  WORKING: 'working…',
  STALE: '? no news for a while',
  TURN_DONE: '★ done~ your turn!',
  IDLE: 'brb~ zZ',
  OFFLINE: 'offline',
  ENDED: 'logged off',
};

/** WORKING phrase for a Kiro session in a spec task. */
export const SPEC_TASK_PHRASE = 'studying hard';

/** A status line in two parts, so the screen can color the phrase. */
export interface StatusParts {
  phrase: string;
  /** The status text cut to 40 code points; absent when there is none or hide-text is on. */
  excerpt?: string;
  /** Set exactly for WORKING: the screen puts the theme's working glyph before the phrase. */
  lead?: 'work';
}

export function statusParts(state: DisplayState, inSpecTask: boolean, statusText: string | undefined, hideText: boolean): StatusParts {
  const phrase = state === 'WORKING' && inSpecTask ? SPEC_TASK_PHRASE : PHRASES[state];
  const parts: StatusParts = { phrase };
  if (state === 'WORKING') parts.lead = 'work';
  if (hideText || statusText === undefined) return parts;
  const excerpt = truncate(statusText, STATUS_TEXT_LIMIT);
  if (excerpt !== '') parts.excerpt = excerpt;
  return parts;
}

/** `phrase` or `phrase · excerpt`, as plain text. It carries no theme glyph (`lead`). */
export function statusLine(parts: StatusParts): string {
  return parts.excerpt === undefined ? parts.phrase : `${parts.phrase} · ${parts.excerpt}`;
}

/** The first `limit` code points of `s`, with no ellipsis: what a text field may hold. */
export function firstCodePoints(s: string, limit: number): string {
  if (s.length <= limit) return s;
  const points = Array.from(s);
  return points.length <= limit ? s : points.slice(0, limit).join('');
}

/**
 * The user's own status message (messenger-app Requirement 18.4, 18.5): runs of white space
 * and control characters become one space, both ends are trimmed. `null` for anything that
 * is not a string, is longer than KEY_MAX UTF-16 units, or is longer than 40 code points after cleaning.
 */
export function cleanMyStatus(v: unknown): string | null {
  if (typeof v !== 'string' || v.length > KEY_MAX) return null;
  const clean = v.replace(/[\s\p{Cc}]+/gu, ' ').trim();
  return codePointLength(clean) <= MY_STATUS_LIMIT ? clean : null;
}
