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
import { dayNumber, keepTip, nextTip, startTip } from '../core/tips';
import type { TipId } from '../core/tips';
import { appBridge, browserSource } from './bridge';
import { renderChrome, setupChrome } from './chrome';
import { keepFocus } from './dom';
import { bannerView, tipContext } from './model/banner';
import type { BannerVM } from './model/banner';
import { connections } from './model/chrome';
import type { Tab } from './model/chrome';
import { inboxHeader, inboxRows } from './model/inbox';
import { meView } from './model/me';
import { buildGroups } from './model/list';
import { skinFocusId } from './model/toolbar';
import type { Clock } from './model/list';
import { renderBanner } from './screens/banner';
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
/** The buddy row clicked last: the selected row while no buddy row has focus (retro-skin Requirement 7.6). Not stored. */
let selected: string | null = null;
/** The shown tip: picked from the date on the first app snapshot, then changed only by the user (retro-skin Requirement 9). */
let tip: TipId | null = null;
/** The local day the user last changed the skin; memory only, gone when the app restarts (S19). */
let skinChangedDay: number | null = null;
function today(): number {
  const now = new Date();
  return dayNumber(now.getFullYear(), now.getMonth() + 1, now.getDate());
}
/** The tip conditions now: no skin tip on a day the user changed the skin (S19). */
const tipsNow = (s: AppSnapshot) => tipContext(s, skinChangedDay === today());
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
    const groups = buildGroups(s, showMore, c);
    if (selected !== null && !groups.some((g) => g.buddies.some((b) => b.key === selected))) selected = null;
    renderList($('.screen-list'), s.settings.theme, groups, bridge !== null, selected, {
      click: (kind, key) => {
        if (kind === 'buddy') {
          selected = key;
          for (const e of $('.screen-list').querySelectorAll<HTMLElement>('.buddy-main')) {
            if (e.dataset['focus'] === `b:${key}`) e.dataset['selected'] = '';
            else delete e.dataset['selected'];
          }
        }
        bridge?.click(kind, key); // the click still acknowledges and jumps (messenger-app Requirements 10.3, 12.1)
      },
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
    renderBanner($('.banner'), s.settings.theme, bannerView(s, tab, tip), { run: runTip, next: showNextTip });
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
/** `▶`, or a tip without an action: the next tip that applies (Requirement 9.6). */
function showNextTip(): void {
  if (snap === null || tip === null) return;
  tip = nextTip(tip, tipsNow(snap));
  render();
}
/** A click on the banner: only screen changes or the next tip; nothing goes to the main process (Requirement 9.10). */
function runTip(vm: BannerVM): void {
  if (vm.action === 'skin') openSkin();
  else if (vm.action === 'sound') openScreen('settings', 'set:sound');
  else if (vm.action === 'inbox') openScreen('inbox');
  else showNextTip();
}
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
  // Only the user changes the skin (Settings); remember the day, in memory only (S19).
  if (snap !== null && snap.settings.theme !== s.settings.theme) skinChangedDay = today();
  snap = s;
  if (s.mode !== 'browser') {
    // The first app snapshot picks the tip from the local date; later ones keep it while it applies (S15, S18).
    tip = tip === null ? startTip(today(), tipsNow(s)) : keepTip(tip, tipsNow(s));
  }
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
