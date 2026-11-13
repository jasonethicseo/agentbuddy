// Where the UI gets its state: the app's preload bridge, or, in a browser, the relay's
// own stream turned into a snapshot (messenger-app Requirement 6.12).
import type { BuddyView } from '../core/buddies';
import type { AppSnapshot, ClickTarget, SettingKey } from '../core/snapshot';
import type { ThemeId } from '../core/theme';
import type { Tab } from './model/chrome';

/** `window.agentbuddy`, exposed by src/app/preload-main.ts. */
export interface AppBridge {
  onState(cb: (s: AppSnapshot) => void): void;
  onDing(cb: () => void): void;
  onScreen(cb: (screen: Exclude<Tab, 'settings'>) => void): void;
  onNotice(cb: (n: { text: string }) => void): void;
  ready(): void;
  click(kind: ClickTarget['kind'], key: string): void;
  ackAll(): void;
  hide(session: string): void;
  setSetting(key: SettingKey, value: boolean): void;
  setGroupOpen(folder: string, open: boolean): void;
  windowAction(action: 'minimize' | 'close'): void;
  setStatus(text: string): void;
  setTheme(theme: ThemeId): void;
}

export function appBridge(): AppBridge | null {
  const b = (window as unknown as { agentbuddy?: AppBridge }).agentbuddy;
  return b !== undefined && typeof b.onState === 'function' ? b : null;
}

const RETRY_MS = 3000;

/** In a browser: read /stream and report snapshots with mode `browser`. */
export function browserSource(onSnapshot: (s: AppSnapshot) => void): void {
  let buddies: BuddyView[] = [];
  let connected = false;
  const port = Number(location.port) || 4343;
  const emit = () =>
    onSnapshot({
      mode: 'browser',
      port,
      connection: connected ? 'ok' : 'disconnected',
      buddies,
      hidden: [],
      unacked: [],
      inbox: [],
      settings: { hideText: false, sound: false, popups: false, macNotifications: false, alwaysOnTop: false, theme: 'blue-bot', hideBanner: true, closedGroups: [], myStatus: '' },
      count: { waiting: 0, unreadTurns: 0, total: 0 },
    });
  const connect = () => {
    const source = new EventSource('/stream');
    source.addEventListener('buddies', (e) => {
      try {
        const data: unknown = JSON.parse((e as MessageEvent<string>).data);
        if (!Array.isArray(data)) return;
        buddies = data as BuddyView[];
        connected = true;
        emit();
      } catch {
        // a broken message: wait for the next one
      }
    });
    source.addEventListener('error', () => {
      connected = false;
      emit();
      // EventSource retries network errors itself, but gives up after an HTTP error reply.
      if (source.readyState === EventSource.CLOSED) setTimeout(connect, RETRY_MS);
    });
  };
  emit();
  connect();
}
