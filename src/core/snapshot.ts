// The contract between the app's main process and its windows, like
// `BuddyView` is between the relay and the UI (messenger-app design, `snapshot.ts`).
// Types only.
import type { BuddyView } from './buddies';
import type { InboxEntry, MenuCount } from './attention';
import type { AttentionState } from './pings';

/** `browser`: the relay's own page, with no app around it. */
export type RelayMode = 'connecting' | 'own' | 'attached' | 'browser';
export type Connection = 'ok' | 'disconnected' | 'foreign' | 'error';

export interface PublicSettings {
  hideText: boolean;
  sound: boolean;
  popups: boolean;
  macNotifications: boolean;
  alwaysOnTop: boolean;
  /** Folders whose group is closed. */
  closedGroups: string[];
}

export interface AppSnapshot {
  mode: RelayMode;
  port: number;
  connection: Connection;
  /** errno code, for connection `error`. */
  errorCode?: string;
  buddies: BuddyView[];
  /** Session keys hidden with ×. */
  hidden: string[];
  /** Session keys with an unacknowledged entry. */
  unacked: string[];
  inbox: InboxEntry[];
  settings: PublicSettings;
  /** Alert strip and menu bar. */
  count: MenuCount;
}

export type ClickTarget = { kind: 'buddy' | 'session' | 'inbox'; key: string };

export type PopupContent =
  | { kind: 'ping'; state: AttentionState; agent: string; folder: string; time: string; phrase: string; detail?: string }
  | { kind: 'notice'; text: string };
