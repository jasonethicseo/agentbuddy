// What a ping shows outside the main window: the pop-up card and the macOS notification body
// (messenger-app Requirements 7.4, 8.8, 9.7). Pure; moved out of controller.ts unchanged.
import type { BuddyView } from '../core/buddies';
import type { Ping } from '../core/pings';
import type { PopupContent } from '../core/snapshot';
import { AGENT_NAMES, PHRASES, folderName, statusParts } from '../core/text';

export interface PingText {
  hideText: boolean;
  /** Local `HH:MM`, or `HH:MM:SS` with `seconds`. */
  formatTime(ms: number, seconds: boolean): string;
}

/** The session name, or `started HH:MM:SS` without one or with hide-text on. */
export function sessionLabel(t: PingText, title: string | undefined, startedAt: string): string {
  return t.hideText || title === undefined ? `started ${t.formatTime(Date.parse(startedAt), true)}` : title;
}

export function popupContent(t: PingText, views: readonly BuddyView[], p: Ping, nowMs: number): PopupContent {
  const b = views.find((v) => v.key === p.buddy);
  const content: Extract<PopupContent, { kind: 'ping' }> = {
    kind: 'ping',
    state: p.state,
    ...(b ? { agentId: b.agent } : {}),
    agent: b ? AGENT_NAMES[b.agent] : p.buddyName,
    folder: b ? folderName(b.cwd) : '',
    time: t.formatTime(nowMs, false),
    phrase: PHRASES[p.state],
  };
  if (t.hideText) return content;
  const excerpt = p.state === 'TURN_DONE' ? statusParts(p.state, false, p.statusText, false).excerpt : undefined;
  content.detail = excerpt ?? `session · ${sessionLabel(t, p.title, p.startedAt)}`;
  return content;
}

export function notificationBody(t: PingText, p: Ping): string {
  return t.hideText ? PHRASES[p.state] : `${PHRASES[p.state]} · ${sessionLabel(t, p.title, p.startedAt)}`;
}
