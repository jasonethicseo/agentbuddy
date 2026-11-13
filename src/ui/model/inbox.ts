// Today's inbox as plain data (messenger-app Requirement 11.3). Pure.
import type { InboxEntry } from '../../core/attention';
import type { AgentId } from '../../core/event';
import type { AttentionState } from '../../core/pings';
import { sessionName } from './list';
import type { Clock } from './list';

export interface InboxRowVM {
  session: string;
  state: AttentionState;
  /** The agent named by the session key, for its sprite (themes Requirement 6.4); absent for a key of another form. */
  agentId?: AgentId;
  agent: string;
  folder: string;
  line: string;
  time: string;
  unread: boolean;
}

const LINE: Readonly<Record<AttentionState, string>> = { WAITING_APPROVAL: 'need your OK', TURN_DONE: 'turn done' };

export const unreadCount = (entries: readonly InboxEntry[]) => entries.filter((e) => !e.acked).length;

export const inboxHeader = (entries: readonly InboxEntry[]) => `Today · ${unreadCount(entries)} unread`;

const AGENTS: readonly AgentId[] = ['kiro', 'claude', 'codex'];
/** A session key is `["<agent>","<session>"]` (core `sessionKey`); anything else gives no agent. */
export function agentOfKey(key: string): AgentId | undefined {
  try {
    const v: unknown = JSON.parse(key);
    const a = Array.isArray(v) ? v[0] : undefined;
    return AGENTS.find((x) => x === a);
  } catch {
    return undefined;
  }
}

/** Newest first. The buddy name `Agent @ folder` is split at its first ` @ `. */
export function inboxRows(entries: readonly InboxEntry[], hideText: boolean, clock: Clock): InboxRowVM[] {
  return [...entries].reverse().map((e) => {
    const at = e.buddyName.indexOf(' @ ');
    const ms = Date.parse(e.at);
    const agentId = agentOfKey(e.session);
    return {
      session: e.session,
      state: e.state,
      ...(agentId !== undefined ? { agentId } : {}),
      agent: at < 0 ? e.buddyName : e.buddyName.slice(0, at),
      folder: at < 0 ? '' : e.buddyName.slice(at + 3),
      line: `${LINE[e.state]} · ${sessionName(e, hideText, clock)}`,
      time: Number.isFinite(ms) ? clock.time(ms, false) : '',
      unread: !e.acked,
    };
  });
}
