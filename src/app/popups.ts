// Pop-up windows: non-activating panels stacked in the bottom-right corner, shown
// without taking focus, closed after a few seconds (messenger-app Requirement 9; O4 runs A and B).
import { BrowserWindow, screen } from 'electron';
import type { WebContents } from 'electron';
import type { PopupContent } from '../core/snapshot';
import type { ThemeId } from '../core/theme';
import { POPUP, POPUP_MS } from './config';
import { CH } from './ipc';
import type { PopupAction } from './ipc';
import { placePopups, popupCapacity } from './popup-layout';
import { popupWindowOptions } from './window-options';

interface Open {
  win: BrowserWindow;
  session: string | null;
  timer: ReturnType<typeof setTimeout>;
}

export function createPopups(o: { preload: string; theme: ThemeId; onAction: (session: string, action: PopupAction) => void }) {
  const open: Open[] = []; // oldest first
  let theme = o.theme;
  const area = () => screen.getPrimaryDisplay().workArea;

  /** Move the remaining pop-ups down; setBounds takes no focus. */
  function layout(): void {
    const points = placePopups(open.length, area(), POPUP, POPUP.gap, POPUP.margin);
    open.forEach((p, i) => {
      const pt = points[i];
      if (pt && !p.win.isDestroyed()) p.win.setBounds({ x: pt.x, y: pt.y, width: POPUP.width, height: POPUP.height });
    });
  }

  function close(p: Open): void {
    clearTimeout(p.timer);
    const i = open.indexOf(p);
    if (i < 0) return;
    open.splice(i, 1);
    if (!p.win.isDestroyed()) p.win.destroy();
    layout();
  }

  function show(session: string | null, content: PopupContent): void {
    const cap = popupCapacity(area(), POPUP, POPUP.gap, POPUP.margin);
    if (cap === 0) return;
    while (open.length >= cap) close(open[0]!); // the oldest goes first (Requirement 9.6)
    const at = placePopups(open.length + 1, area(), POPUP, POPUP.gap, POPUP.margin).at(-1)!;
    let win: BrowserWindow;
    try {
      win = new BrowserWindow(popupWindowOptions({ preload: o.preload, x: at.x, y: at.y }));
    } catch {
      return; // the ding and the inbox still happen
    }
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    const p: Open = { win, session, timer: setTimeout(() => close(p), POPUP_MS) };
    open.push(p);
    win.on('closed', () => close(p));
    win.webContents.once('did-finish-load', () => {
      if (win.isDestroyed()) return;
      win.webContents.send(CH.popupContent, content);
      win.showInactive(); // neither activates the app nor makes the panel key
    });
    win.webContents.once('did-fail-load', () => close(p));
    win.loadURL(`app://ui/popup.html?theme=${theme}`).catch(() => close(p));
  }

  const find = (sender: WebContents) => open.find((p) => !p.win.isDestroyed() && p.win.webContents === sender);

  return {
    show,
    /** Later pop-ups open in `t`; open ones change at once, without moving or closing (themes Requirement 2.5). */
    setTheme(t: ThemeId): void {
      theme = t;
      for (const p of open) if (!p.win.isDestroyed()) p.win.webContents.send(CH.popupTheme, t);
    },
    isPopup: (sender: WebContents) => find(sender) !== undefined,
    /** A button in a pop-up: it closes, then its action goes on (Requirement 9.5). */
    handle(sender: WebContents, action: PopupAction): void {
      const p = find(sender);
      if (p === undefined) return;
      close(p);
      if (p.session !== null) o.onAction(p.session, action);
    },
    /** Close the pop-ups of acknowledged sessions (Requirement 9.8). */
    closeSessions(keys: readonly string[]): void {
      for (const p of [...open]) if (p.session !== null && keys.includes(p.session)) close(p);
    },
    closeAll(): void {
      for (const p of [...open]) close(p);
    },
  };
}
