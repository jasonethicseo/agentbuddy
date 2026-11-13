// The main window: top-right corner, own title bar, hides instead of closing,
// optional always-on-top (messenger-app Requirements 5.1, 5.2, 5.5, 5.9, 5.12).
import { BrowserWindow, app, screen } from 'electron';
import type { ThemeId } from '../core/theme';
import { MAIN_FRAME } from './config';
import type { WindowAction } from './ipc';
import { THEME_BACKGROUND, mainWindowOptions, mainWindowPosition } from './window-options';

export interface MainWindow {
  /** Restore, show and focus it (the user asked for it from the menu bar). */
  show(): void;
  setAlwaysOnTop(on: boolean): void;
  /** An opaque window takes the theme's background; a transparent one has none. */
  setTheme(theme: ThemeId): void;
  action(a: WindowAction): void;
  send(channel: string, payload?: unknown): void;
  /** Shown and not minimized. */
  isVisible(): boolean;
  owns(sender: Electron.WebContents): boolean;
}

export function createMainWindow(o: { preload: string; alwaysOnTop: boolean; theme: ThemeId; isQuitting: () => boolean }): MainWindow {
  const pos = mainWindowPosition(screen.getPrimaryDisplay().workArea);
  const win = new BrowserWindow(mainWindowOptions({ preload: o.preload, ...pos, alwaysOnTop: o.alwaysOnTop, theme: o.theme, frame: MAIN_FRAME }));
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
  // The theme and the frame ride in the URL, so the first frame already has them (themes Requirement 2.7).
  void win.loadURL(`app://ui/index.html?theme=${o.theme}&frame=${MAIN_FRAME}`);

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
    setTheme(theme) {
      if (!win.isDestroyed() && MAIN_FRAME === 'opaque') win.setBackgroundColor(THEME_BACKGROUND[theme]);
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
