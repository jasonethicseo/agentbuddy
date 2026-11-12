// Electron security for every window (messenger-app Requirements 13 → 15.3, 15.4, 16.3):
// no navigation, no new windows, no webviews, no permissions, no request other than the
// app's own `app://ui/` files, and IPC accepted only from our own windows with checked payloads.
import { app, ipcMain, session } from 'electron';
import type { WebContents } from 'electron';

export const UI_ORIGIN = 'app://ui/';

export function installSecurity(): void {
  app.on('web-contents-created', (_e, wc) => {
    wc.on('will-navigate', (e) => e.preventDefault());
    wc.on('will-redirect', (e) => e.preventDefault());
    wc.on('will-attach-webview', (e) => e.preventDefault());
    wc.setWindowOpenHandler(() => ({ action: 'deny' }));
  });
  const s = session.defaultSession;
  s.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  s.setPermissionCheckHandler(() => false);
  // `<all_urls>` also matches the custom app:// scheme (O4 run A), so our own files pass by prefix.
  s.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => callback({ cancel: !details.url.startsWith(UI_ORIGIN) }));
}

/**
 * Listens on `channel` and calls `handler` only when the message comes from a frame
 * showing our own UI, from a window that `allowed` accepts, with a payload that `check` accepts.
 * Anything else is dropped without a reply.
 */
export function onTrusted<T>(
  channel: string,
  check: (payload: unknown) => T | null,
  allowed: (sender: WebContents) => boolean,
  handler: (payload: T, sender: WebContents) => void,
): void {
  ipcMain.on(channel, (event, payload: unknown) => {
    const url = event.senderFrame?.url ?? '';
    if (!url.startsWith(UI_ORIGIN) || !allowed(event.sender)) return;
    const value = check(payload);
    if (value !== null) handler(value, event.sender);
  });
}
