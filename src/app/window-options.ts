// BrowserWindow options for the main window and pop-ups, as plain objects so the
// security flags are unit-tested without Electron (messenger-app Requirements 5.1, 9.2, 9.3, 15.1).
import type { BrowserWindowConstructorOptions, WebPreferences } from 'electron';
import { MAIN, POPUP } from './config';
import type { Point, Rect } from './popup-layout';

/** Every window: isolated, sandboxed, no Node, no webviews, no spell-check downloads. */
export const SECURE_PREFERENCES = {
  contextIsolation: true,
  nodeIntegration: false,
  nodeIntegrationInWorker: false,
  nodeIntegrationInSubFrames: false,
  sandbox: true,
  webSecurity: true,
  allowRunningInsecureContent: false,
  webviewTag: false,
  spellcheck: false,
  navigateOnDragDrop: false,
  safeDialogs: true,
} as const satisfies WebPreferences;

/** Top-right corner of the visible area, `MAIN.margin` in from the edges. */
export function mainWindowPosition(area: Rect): Point {
  return { x: area.x + area.width - MAIN.width - MAIN.margin, y: area.y + MAIN.margin };
}

export function mainWindowOptions(o: { preload: string; x: number; y: number; alwaysOnTop: boolean }): BrowserWindowConstructorOptions {
  return {
    title: 'AgentBuddy',
    x: o.x,
    y: o.y,
    width: MAIN.width,
    height: MAIN.height,
    minWidth: MAIN.width,
    maxWidth: MAIN.width,
    minHeight: MAIN.minHeight,
    // The page draws its own title bar (Requirement 5.9). Not transparent: Electron
    // documents transparent windows as not resizable.
    frame: false,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: o.alwaysOnTop,
    backgroundColor: '#F4F8FD',
    show: false,
    webPreferences: { ...SECURE_PREFERENCES, preload: o.preload, backgroundThrottling: false },
  };
}

export function popupWindowOptions(o: { preload: string; x: number; y: number }): BrowserWindowConstructorOptions {
  return {
    title: 'AgentBuddy message',
    x: o.x,
    y: o.y,
    width: POPUP.width,
    height: POPUP.height,
    // A non-activating panel that never takes focus; its first click still arrives (O4 runs A and B).
    type: 'panel',
    focusable: false,
    acceptFirstMouse: true,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    show: false,
    webPreferences: { ...SECURE_PREFERENCES, preload: o.preload },
  };
}
