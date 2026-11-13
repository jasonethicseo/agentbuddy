// A pop-up's bridge: receive its content and its theme, report one of three buttons
// (messenger-app Requirement 15.2; themes Requirement 2.5).
import { contextBridge, ipcRenderer } from 'electron';
import type { PopupContent } from '../core/snapshot';
import type { ThemeId } from '../core/theme';
import { CH } from './ipc';

/** A main-to-pop-up channel that keeps its last value for a late subscriber. */
function inbound<T>(channel: string) {
  let last: { v: T } | null = null;
  const subs: Array<(v: T) => void> = [];
  ipcRenderer.on(channel, (_event, v: T) => {
    last = { v };
    for (const s of subs) s(v);
  });
  return (cb: (v: T) => void): void => {
    if (typeof cb !== 'function') return;
    subs.push(cb);
    if (last !== null) cb(last.v);
  };
}

contextBridge.exposeInMainWorld('agentbuddyPopup', {
  onContent: inbound<PopupContent>(CH.popupContent),
  onTheme: inbound<ThemeId>(CH.popupTheme),
  go: () => ipcRenderer.send(CH.popupClick, { action: 'go' }),
  close: () => ipcRenderer.send(CH.popupClick, { action: 'close' }),
  later: () => ipcRenderer.send(CH.popupClick, { action: 'later' }),
});
