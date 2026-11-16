// The demo host (submission design "Host"): runs the app's controller on the replayed lists and gives the
// main window frame and each pop-up frame the bridge the Electron preloads give in the app.
import type { AppSnapshot, PopupContent } from '../core/snapshot';
import type { ThemeId } from '../core/theme';
import { DEFAULT_THEME } from '../core/theme';
import { POPUP, POPUP_MS } from '../app/config';
import { createController } from '../app/controller';
import type { Controller } from '../app/controller';
import type { PopupAction } from '../app/ipc';
import type { AppBridge } from '../ui/bridge';
import { ding } from '../ui/sound';
import { demoPorts, demoSettings } from './ports';
import { createDriver } from './replay';
import { stampEvents } from './scenario';
import type { Scenario } from './scenario';

/** The bridge `src/ui/screens/popup.ts` reads from `window.agentbuddyPopup`. */
export interface PopupBridge {
  onContent(cb: (c: PopupContent) => void): void;
  onTheme(cb: (t: ThemeId) => void): void;
  go(): void;
  close(): void;
  later(): void;
}

interface OpenPopup {
  id: string;
  session: string | null;
  content: PopupContent;
  frame: HTMLIFrameElement;
  timer: ReturnType<typeof setTimeout>;
  onContent?: (c: PopupContent) => void;
  onTheme?: (t: ThemeId) => void;
}

const TICK_MS = 250;
/** Ticks go on this long after the end, then stop; the page stays usable. */
const AFTER_END_S = 10;

export interface HostOptions {
  scenario: Scenario;
  windowFrame: HTMLIFrameElement;
  popupLayer: HTMLElement;
  onEnd(): void;
  /** The skin of every snapshot, so the page around the window can follow it. */
  onTheme(theme: ThemeId): void;
}

export function createHost(o: HostOptions) {
  let controller: Controller | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  let theme: ThemeId = DEFAULT_THEME;
  let nextId = 1;
  let onState: ((s: AppSnapshot) => void) | undefined;
  let onNotice: Parameters<AppBridge['onNotice']>[0] | undefined;
  const open: OpenPopup[] = []; // oldest first

  function closePopup(p: OpenPopup): void {
    clearTimeout(p.timer);
    const i = open.indexOf(p);
    if (i >= 0) open.splice(i, 1);
    p.frame.remove();
  }
  const capacity = () => Math.max(1, Math.floor((window.innerHeight - POPUP.margin) / (POPUP.height + POPUP.gap)));
  function showPopup(session: string | null, content: PopupContent): void {
    while (open.length >= capacity()) closePopup(open[0]!); // the oldest goes first, as in the app
    const id = String(nextId++);
    const frame = document.createElement('iframe');
    frame.className = 'demo-popup';
    frame.title = 'AgentBuddy message';
    frame.width = String(POPUP.width);
    frame.height = String(POPUP.height);
    frame.src = `popup.html?theme=${theme}&id=${id}`;
    const p: OpenPopup = { id, session, content, frame, timer: setTimeout(() => closePopup(p), POPUP_MS) };
    open.push(p);
    o.popupLayer.prepend(frame); // newest on top
  }
  const outputs = {
    pushState: (s: AppSnapshot) => {
      theme = s.settings.theme;
      o.onTheme(theme);
      onState?.(s);
    },
    showPopup,
    closePopups: (sessions: readonly string[]) => {
      for (const p of [...open]) if (p.session !== null && sessions.includes(p.session)) closePopup(p);
    },
    ding, // played here: the Start demo click unlocked audio in this page
    notice: (text: string) => onNotice?.({ text }),
    applyTheme: (t: ThemeId) => {
      theme = t;
      for (const p of open) p.onTheme?.(t);
    },
  };

  function tick(startMs: number, driver: ReturnType<typeof createDriver>, ended: { done: boolean }): void {
    const now = Date.now();
    const views = driver.step(now);
    if (views !== null) controller?.onList(views, false);
    const t = (now - startMs) / 1000;
    if (!ended.done && t >= o.scenario.end) {
      ended.done = true;
      o.onEnd();
    }
    if (t >= o.scenario.end + AFTER_END_S) clearInterval(timer);
  }

  function start(): void {
    if (timer !== undefined) clearInterval(timer);
    const startMs = Date.now();
    const driver = createDriver(stampEvents(o.scenario, startMs), startMs);
    controller = createController({ settings: demoSettings(), records: [], port: 0 }, demoPorts(outputs));
    controller.onLink('demo', 'ok');
    controller.onList(driver.start(), true); // the events before the start: a baseline, never a ping
    const ended = { done: false };
    timer = setInterval(() => tick(startMs, driver, ended), TICK_MS);
  }

  return {
    start,
    /** Start again from an empty list, with a fresh window (its UI state starts over). */
    replay(): void {
      for (const p of [...open]) closePopup(p);
      o.windowFrame.contentWindow?.location.reload();
      start();
    },
    mainBridge(): AppBridge {
      return {
        onState: (cb) => void (onState = cb),
        onDing: () => {}, // the host plays the ding once (design "Overview")
        onScreen: () => {},
        onNotice: (cb) => void (onNotice = cb),
        ready: () => controller?.refresh(),
        click: (kind, key) => controller?.onClick({ kind, key }),
        ackAll: () => controller?.onAckAll(),
        hide: (session) => controller?.onHide(session),
        setSetting: (key, value) => controller?.onSetting(key, value),
        setGroupOpen: (folder, isOpen) => controller?.onGroup(folder, isOpen),
        windowAction: (action) => controller?.onWindow(action),
        setStatus: (text) => controller?.onStatus(text),
        setTheme: (t) => controller?.onTheme(t),
      };
    },
    popupBridge(id: string): PopupBridge | undefined {
      const p = open.find((x) => x.id === id);
      if (p === undefined) return undefined;
      const act = (action: PopupAction) => {
        closePopup(p);
        if (p.session !== null) controller?.onPopup(p.session, action);
      };
      return {
        onContent: (cb) => {
          p.onContent = cb;
          cb(p.content);
        },
        onTheme: (cb) => void (p.onTheme = cb),
        go: () => act('go'),
        close: () => act('close'),
        later: () => act('later'),
      };
    },
  };
}

export type DemoHost = ReturnType<typeof createHost>;
