// A pop-up's bridge: receive its content, report one of three buttons (messenger-app Requirement 15.2).
import { contextBridge, ipcRenderer } from 'electron';
import type { PopupContent } from '../core/snapshot';
import { CH } from './ipc';

let content: PopupContent | null = null;
const subs: Array<(c: PopupContent) => void> = [];
ipcRenderer.on(CH.popupContent, (_event, c: PopupContent) => {
  content = c;
  for (const s of subs) s(c);
});

contextBridge.exposeInMainWorld('agentbuddyPopup', {
  onContent(cb: (c: PopupContent) => void): void {
    if (typeof cb !== 'function') return;
    subs.push(cb);
    if (content !== null) cb(content);
  },
  go: () => ipcRenderer.send(CH.popupClick, { action: 'go' }),
  close: () => ipcRenderer.send(CH.popupClick, { action: 'close' }),
  later: () => ipcRenderer.send(CH.popupClick, { action: 'later' }),
});
