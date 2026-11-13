// Builders for BuddyView lists, as the relay sends them. Only /Users/dev/... paths and short fake IDs.
import type { BuddyView, SessionView } from '../../src/core/buddies';
import type { AgentId } from '../../src/core/event';
import type { AppSnapshot, PublicSettings } from '../../src/core/snapshot';
import type { DisplayState } from '../../src/core/state';

export const T0 = Date.parse('2026-11-12T05:00:00.000Z');
export const iso = (ms: number) => new Date(ms).toISOString();

export interface SessionSpec {
  key: string;
  state: DisplayState;
  /** Seconds after T0 of the last event. */
  last?: number;
  title?: string;
  statusText?: string;
}

export function sessionView(s: SessionSpec): SessionView {
  const v: SessionView = { key: s.key, session: s.key.slice(0, 8), state: s.state, lastAt: iso(T0 + (s.last ?? 0) * 1000), startedAt: iso(T0) };
  if (s.title !== undefined) v.title = s.title;
  if (s.statusText !== undefined) v.statusText = s.statusText;
  return v;
}

export function buddyView(agent: AgentId, cwd: string, sessions: SessionSpec[]): BuddyView {
  const views = sessions.map(sessionView);
  const name = `${{ kiro: 'Kiro', claude: 'Claude Code', codex: 'Codex' }[agent]} @ ${cwd.split('/').at(-1)}`;
  return {
    key: JSON.stringify([agent, cwd]),
    agent,
    name,
    cwd,
    state: views[0]?.state ?? 'OFFLINE',
    lastAt: views[0]?.lastAt ?? iso(T0),
    sessions: views,
  };
}

/** Session keys as the relay makes them: JSON of agent + session ID. */
export const key = (agent: AgentId, session: string) => JSON.stringify([agent, session]);

/** An app snapshot around `buddies`, with the default settings unless overridden. */
export function snapshot(buddies: BuddyView[], over: Partial<AppSnapshot> = {}, settings: Partial<PublicSettings> = {}): AppSnapshot {
  return {
    mode: 'attached',
    port: 4343,
    connection: 'ok',
    buddies,
    hidden: [],
    unacked: [],
    inbox: [],
    settings: { hideText: false, sound: true, popups: true, macNotifications: false, alwaysOnTop: true, closedGroups: [], myStatus: '', ...settings },
    count: { waiting: 0, unreadTurns: 0, total: 0 },
    ...over,
  };
}
