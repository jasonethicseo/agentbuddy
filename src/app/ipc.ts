// IPC channels between the app's main process and its windows, and the check on
// every message a window sends (messenger-app Requirements 15.2, 15.3).
// Plain module: no Electron import, so it is testable and shared with the preloads.
import { KEY_MAX } from '../core/config';
import type { ClickTarget, SettingKey } from '../core/snapshot';
import { cleanMyStatus } from '../core/text';

export const CH = {
  // main process → main window
  state: 'app:state',
  ding: 'app:ding',
  screen: 'app:screen',
  notice: 'app:notice',
  // main window → main process
  ready: 'ui:ready',
  click: 'ui:click',
  hide: 'ui:hide',
  setting: 'ui:setting',
  group: 'ui:group',
  ackAll: 'ui:ackAll',
  window: 'ui:window',
  status: 'ui:status',
  // main process ↔ pop-up
  popupContent: 'popup:content',
  popupClick: 'popup:click',
} as const;

export const SETTING_KEYS: readonly SettingKey[] = ['hideText', 'sound', 'popups', 'macNotifications', 'alwaysOnTop'];
export type WindowAction = 'minimize' | 'close';
/** `go`: Go there or the card; `close`: × (acknowledges); `later`: Later (does not). */
export type PopupAction = 'go' | 'close' | 'later';
export type Screen = 'list' | 'inbox';

/** What each window-to-main channel carries once checked. `true` stands for "no payload". */
export interface UiMessages {
  'ui:ready': true;
  'ui:click': ClickTarget;
  'ui:hide': { session: string };
  'ui:setting': { key: SettingKey; value: boolean };
  'ui:group': { folder: string; open: boolean };
  'ui:ackAll': true;
  'ui:window': { action: WindowAction };
  'ui:status': { text: string };
}
export interface PopupMessages {
  'popup:click': { action: PopupAction };
}

const isKey = (v: unknown): v is string => typeof v === 'string' && v.length >= 1 && v.length <= KEY_MAX;
const oneOf = <T extends string>(values: readonly T[], v: unknown): v is T => typeof v === 'string' && (values as readonly string[]).includes(v);

/** Own data property of a plain object, else undefined. */
function prop(v: unknown, name: string): unknown {
  if (typeof v !== 'object' || v === null || Array.isArray(v) || !Object.hasOwn(v, name)) return undefined;
  return (v as Record<string, unknown>)[name];
}

/** Wraps a check so that nothing a window sends can make it throw. */
function safe<T>(check: (v: unknown) => T | null): (v: unknown) => T | null {
  return (v) => {
    try {
      return check(v);
    } catch {
      return null;
    }
  };
}

const none = safe((v) => (v === undefined ? (true as const) : null));

export const UI_CHECKS: { readonly [C in keyof UiMessages]: (v: unknown) => UiMessages[C] | null } = {
  'ui:ready': none,
  'ui:click': safe((v) => {
    const kind = prop(v, 'kind');
    const key = prop(v, 'key');
    return oneOf(['buddy', 'session', 'inbox'] as const, kind) && isKey(key) ? { kind, key } : null;
  }),
  'ui:hide': safe((v) => {
    const session = prop(v, 'session');
    return isKey(session) ? { session } : null;
  }),
  'ui:setting': safe((v) => {
    const key = prop(v, 'key');
    const value = prop(v, 'value');
    return oneOf(SETTING_KEYS, key) && typeof value === 'boolean' ? { key, value } : null;
  }),
  'ui:group': safe((v) => {
    const folder = prop(v, 'folder');
    const open = prop(v, 'open');
    return isKey(folder) && typeof open === 'boolean' ? { folder, open } : null;
  }),
  'ui:ackAll': none,
  'ui:window': safe((v) => {
    const action = prop(v, 'action');
    return oneOf(['minimize', 'close'] as const, action) ? { action } : null;
  }),
  // The "me" status message, cleaned again here (Requirement 18.5).
  'ui:status': safe((v) => {
    const text = cleanMyStatus(prop(v, 'text'));
    return text === null ? null : { text };
  }),
};

export const POPUP_CHECKS: { readonly [C in keyof PopupMessages]: (v: unknown) => PopupMessages[C] | null } = {
  'popup:click': safe((v) => {
    const action = prop(v, 'action');
    return oneOf(['go', 'close', 'later'] as const, action) ? { action } : null;
  }),
};
