// The contract between the app's main process and its windows, like
// `BuddyView` is between the relay and the UI (messenger-app design, `snapshot.ts`).
// Types only.
import type { BuddyView } from './buddies';
import type { InboxEntry, MenuCount } from './attention';
import type { AttentionState } from './pings';
import type { ThemeId } from './theme';

/** `browser`: the relay's own page, with no app around it. */
export type RelayMode = 'connecting' | 'own' | 'attached' | 'browser';
export type Connection = 'ok' | 'disconnected' | 'foreign' | 'error';

export interface PublicSettings {
  hideText: boolean;
  sound: boolean;
  popups: boolean;
  macNotifications: boolean;
  alwaysOnTop: boolean;
  /** The look of the main window and the pop-ups (themes Requirement 1). */
  theme: ThemeId;
  /** Folders whose group is closed. */
  closedGroups: string[];
  /** The user's own status message in the "me" row; '' when unset (messenger-app Requirement 18). */
  myStatus: string;
}

/** The five on/off settings a window may change. */
export type SettingKey = Exclude<keyof PublicSettings, 'closedGroups' | 'myStatus' | 'theme'>;

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
