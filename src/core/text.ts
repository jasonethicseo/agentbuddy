// Text helpers: truncation, code point counting and buddy names.
// Pure: no file system, network, timers or clock.

import { TEXT_LIMIT } from './config';
import type { AgentId } from './event';

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
