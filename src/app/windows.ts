// The main window: top-right corner, own title bar, hides instead of closing,
// optional always-on-top (messenger-app Requirements 5.1, 5.2, 5.5, 5.9, 5.12).
import { BrowserWindow, app, screen } from 'electron';
import type { WindowAction } from './ipc';
import { mainWindowOptions, mainWindowPosition } from './window-options';

export interface MainWindow {
  /** Restore, show and focus it (the user asked for it from the menu bar). */
  show(): void;
  setAlwaysOnTop(on: boolean): void;
  action(a: WindowAction): void;
  send(channel: string, payload?: unknown): void;
  /** Shown and not minimized. */
  isVisible(): boolean;
  owns(sender: Electron.WebContents): boolean;
}

export function createMainWindow(o: { preload: string; alwaysOnTop: boolean; isQuitting: () => boolean }): MainWindow {
  const pos = mainWindowPosition(screen.getPrimaryDisplay().workArea);
  const win = new BrowserWindow(mainWindowOptions({ preload: o.preload, ...pos, alwaysOnTop: o.alwaysOnTop }));
  if (o.alwaysOnTop) win.setAlwaysOnTop(true, 'floating');
  win.once('ready-to-show', () => win.show());
  win.on('close', (e) => {
    if (o.isQuitting()) return;
    e.preventDefault();
    win.hide();
  });
  win.webContents.on('render-process-gone', () => {
    if (!win.isDestroyed()) win.reload();
  });
  void win.loadURL('app://ui/index.html');

  return {
    show() {
      if (win.isDestroyed()) return;
      if (win.isMinimized()) win.restore();
      win.show();
      app.focus({ steal: true });
    },
    setAlwaysOnTop(on) {
      if (!win.isDestroyed()) win.setAlwaysOnTop(on, 'floating');
    },
    action(a) {
      if (win.isDestroyed()) return;
      if (a === 'minimize') win.minimize();
      else win.hide();
    },
    send(channel, payload) {
      if (!win.isDestroyed()) win.webContents.send(channel, payload);
    },
    isVisible: () => !win.isDestroyed() && win.isVisible() && !win.isMinimized(),
    owns: (sender) => !win.isDestroyed() && sender === win.webContents,
  };
}
