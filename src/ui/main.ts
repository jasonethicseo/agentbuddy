// UI entry for the main window and the relay's page (messenger-app Requirement 6.12).
// In the app, state comes from the preload bridge; in a browser, from the relay's stream.
import './styles/themes.css';
import './styles/sprites.css';
import './styles/fonts.css';
import './styles/materials.css';
import './styles/main.css';
import './styles/list.css';
import './styles/inbox.css';
import './styles/settings.css';
import type { AppSnapshot } from '../core/snapshot';
import { appBridge, browserSource } from './bridge';
import { renderChrome, setupChrome } from './chrome';
import { keepFocus } from './dom';
import { connections } from './model/chrome';
import type { Tab } from './model/chrome';
import { inboxHeader, inboxRows } from './model/inbox';
import { meView } from './model/me';
import { buildGroups } from './model/list';
import { skinFocusId } from './model/toolbar';
import type { Clock } from './model/list';
import { renderInbox } from './screens/inbox';
import { renderList } from './screens/list';
import { renderMe } from './screens/me';
import { renderSettings } from './screens/settings';
import { ding } from './sound';
import { applyTheme, applyThemeFromUrl } from './theme';

applyThemeFromUrl(); // before anything renders (themes Requirement 2.7)

const NOTICE_MS = 4000;
const AGE_TICK_MS = 30_000;
const $ = (selector: string) => document.querySelector<HTMLElement>(selector)!;

const bridge = appBridge();
let snap: AppSnapshot | null = null;
let tab: Tab = 'list';
let notice: { text: string; timer: ReturnType<typeof setTimeout> } | undefined;
const showMore = new Set<string>();
/** Browser only: groups toggled locally, since nothing is saved there. */
const localGroups = new Set<string>();

const clock = (): Clock => ({
  nowMs: Date.now(),
  time: (ms, seconds) =>
    new Date(ms).toLocaleTimeString('en-GB', seconds ? { hour: '2-digit', minute: '2-digit', second: '2-digit' } : { hour: '2-digit', minute: '2-digit' }),
});

function render(): void {
  if (snap === null) return;
  const s = bridge ? snap : { ...snap, settings: { ...snap.settings, closedGroups: [...localGroups] } };
  keepFocus(() => {
    renderChrome(s, tab, notice?.text);
    renderMe($('.me-row'), meView(s, tab), { save: (text) => bridge?.setStatus(text) });
    const c = clock();
    renderList($('.screen-list'), s.settings.theme, buildGroups(s, showMore, c), bridge !== null, {
      click: (kind, key) => bridge?.click(kind, key),
      hide: (session) => bridge?.hide(session),
      setGroupOpen: (key, open) => {
        if (bridge) return bridge.setGroupOpen(key, open);
        if (open) localGroups.delete(key);
        else localGroups.add(key);
        render();
      },
      toggleMore: (key) => {
        if (!showMore.delete(key)) showMore.add(key);
        render();
      },
    });
    if (bridge === null) return;
    renderInbox($('.screen-inbox'), s.settings.theme, inboxHeader(s.inbox), inboxRows(s.inbox, s.settings.hideText, c), {
      click: (session) => bridge.click('inbox', session),
      ackAll: () => bridge.ackAll(),
    });
    renderSettings($('.screen-settings'), s.settings, connections(s), {
      setSetting: (key, value) => bridge.setSetting(key, value),
      setTheme: (theme) => bridge.setTheme(theme),
    });
  });
}

/** Opens a screen and, when asked, moves focus to one of its controls by its fixed `data-focus` id. */
function openScreen(t: Tab, focusId?: string): void {
  tab = t;
  render();
  if (focusId === undefined) return;
  const target = [...document.querySelectorAll<HTMLElement>('[data-focus]')].find((e) => e.dataset['focus'] === focusId);
  target?.scrollIntoView({ block: 'nearest' });
  target?.focus();
}
/** `Skin`: Settings at the Skin group, focus on the checked radio (retro-skin Requirement 6.4). */
const openSkin = () => {
  if (snap !== null) openScreen('settings', skinFocusId(snap.settings.theme));
};
setupChrome(
  {
    setTab: (t) => openScreen(t),
    openSkin,
    pin: (on) => bridge?.setSetting('alwaysOnTop', on),
    windowAction: (action) => bridge?.windowAction(action),
  },
  bridge !== null,
);

const onSnapshot = (s: AppSnapshot) => {
  snap = s;
  applyTheme(s.settings.theme);
  render();
};

if (bridge) {
  bridge.onState(onSnapshot);
  bridge.onDing(ding);
  bridge.onScreen((screen) => {
    tab = screen;
    render();
  });
  bridge.onNotice(({ text }) => {
    if (notice) clearTimeout(notice.timer);
    notice = { text, timer: setTimeout(() => ((notice = undefined), render()), NOTICE_MS) };
    render();
  });
  bridge.ready();
} else {
  browserSource(onSnapshot);
}
setInterval(render, AGE_TICK_MS); // ages ("2m") move on
