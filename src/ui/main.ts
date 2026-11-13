// UI entry for the main window and the relay's page (messenger-app Requirement 6.12).
// In the app, state comes from the preload bridge; in a browser, from the relay's stream.
import './styles/tokens.css';
import './styles/fonts.css';
import './styles/icons.css';
import './styles/main.css';
import type { AppSnapshot } from '../core/snapshot';
import { appBridge, browserSource } from './bridge';
import { renderChrome, setupChrome } from './chrome';
import { keepFocus } from './dom';
import { connections } from './model/chrome';
import type { Tab } from './model/chrome';
import { inboxHeader, inboxRows } from './model/inbox';
import { meView } from './model/me';
import { buildGroups } from './model/list';
import type { Clock } from './model/list';
import { renderInbox } from './screens/inbox';
import { renderList } from './screens/list';
import { renderMe } from './screens/me';
import { renderSettings } from './screens/settings';
import { ding } from './sound';

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
    renderList($('.screen-list'), buildGroups(s, showMore, c), bridge !== null, {
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
    renderInbox($('.screen-inbox'), inboxHeader(s.inbox), inboxRows(s.inbox, s.settings.hideText, c), {
      click: (session) => bridge.click('inbox', session),
      ackAll: () => bridge.ackAll(),
    });
    renderSettings($('.screen-settings'), s.settings, connections(s), { setSetting: (key, value) => bridge.setSetting(key, value) });
  });
}

setupChrome(
  {
    setTab: (t) => {
      tab = t;
      render();
    },
    pin: (on) => bridge?.setSetting('alwaysOnTop', on),
    windowAction: (action) => bridge?.windowAction(action),
  },
  bridge !== null,
);

const onSnapshot = (s: AppSnapshot) => {
  snap = s;
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
