// The main window's bridge: only these functions, no ipcRenderer, no Node
// (messenger-app Requirement 15.2). Runs sandboxed; bundled to CommonJS.
import { contextBridge, ipcRenderer } from 'electron';
import type { AppSnapshot, ClickTarget, SettingKey } from '../core/snapshot';
import { CH } from './ipc';
import type { Screen, WindowAction } from './ipc';

/** A main-to-window channel. With `keepLast`, a late subscriber gets the last value at once. */
function inbound<T>(channel: string, keepLast: boolean) {
  const subs: Array<(v: T) => void> = [];
  let last: { v: T } | null = null;
  ipcRenderer.on(channel, (_event, v: T) => {
    if (keepLast) last = { v };
    for (const s of subs) s(v);
  });
  return (cb: (v: T) => void): void => {
    if (typeof cb !== 'function') return;
    subs.push(cb);
    if (last !== null) cb(last.v);
  };
}

contextBridge.exposeInMainWorld('agentbuddy', {
  onState: inbound<AppSnapshot>(CH.state, true),
  onDing: inbound<undefined>(CH.ding, false),
  onScreen: inbound<Screen>(CH.screen, true),
  onNotice: inbound<{ text: string }>(CH.notice, false),
  ready: () => ipcRenderer.send(CH.ready),
  click: (kind: ClickTarget['kind'], key: string) => ipcRenderer.send(CH.click, { kind, key }),
  ackAll: () => ipcRenderer.send(CH.ackAll),
  hide: (session: string) => ipcRenderer.send(CH.hide, { session }),
  setSetting: (key: SettingKey, value: boolean) => ipcRenderer.send(CH.setting, { key, value }),
  setGroupOpen: (folder: string, open: boolean) => ipcRenderer.send(CH.group, { folder, open }),
  windowAction: (action: WindowAction) => ipcRenderer.send(CH.window, { action }),
});
