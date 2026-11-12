// Pings: a session entering an attention state between two lists that arrive
// one after the other (messenger-app Requirements 8.1–8.3).
// Pure: no file system, network, timers or clock.
import type { BuddyView } from './buddies';
import type { DisplayState } from './state';

/** The states that ping: the agent needs the user's OK, or finished its turn. */
export type AttentionState = 'WAITING_APPROVAL' | 'TURN_DONE';

export function isAttention(state: unknown): state is AttentionState {
  return state === 'WAITING_APPROVAL' || state === 'TURN_DONE';
}

export interface Ping {
  /** Session key. */
  session: string;
  /** Buddy key. */
  buddy: string;
  buddyName: string;
  state: AttentionState;
  title?: string;
  statusText?: string;
  startedAt: string;
}

/**
 * One ping for each session whose displayed state in `next` is an attention
 * state and differs from its state in `prev`, or that was not in `prev`.
 * `prev === null` marks a baseline list (first list after a connection): no
 * pings, so restored states and states reached while disconnected never ping.
 * Pings come out in list order.
 */
export function detectPings(prev: readonly BuddyView[] | null, next: readonly BuddyView[]): Ping[] {
  if (prev === null) return [];
  const before = new Map<string, DisplayState>();
  for (const b of prev) for (const s of b.sessions) before.set(s.key, s.state);
  const seen = new Set<string>();
  const pings: Ping[] = [];
  for (const b of next) {
    for (const s of b.sessions) {
      if (seen.has(s.key)) continue;
      seen.add(s.key);
      if (!isAttention(s.state) || before.get(s.key) === s.state) continue;
      const ping: Ping = { session: s.key, buddy: b.key, buddyName: b.name, state: s.state, startedAt: s.startedAt };
      if (s.title !== undefined) ping.title = s.title;
      if (s.statusText !== undefined) ping.statusText = s.statusText;
      pings.push(ping);
    }
  }
  return pings;
}
