// The window around the screens: title bar, toolbar, alert strip and status bar (messenger-app Requirements
// 5.9–5.11, 6.10; themes Requirements 4, 7.1; retro-skin Requirements 5, 6, 8). Fills the static parts of index.html.
import type { AppSnapshot } from '../core/snapshot';
import type { ThemeId } from '../core/theme';
import { el } from './dom';
import { alertText, footer } from './model/chrome';
import type { Tab } from './model/chrome';
import { unreadCount } from './model/inbox';
import { TOOLS, rovingTarget, toolbarView } from './model/toolbar';
import type { Tool } from './model/toolbar';
import { icon } from './sprites/icons';
import type { IconName } from './sprites/icons';
import { sprite } from './sprites/render';
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
export interface ChromeActions {
  setTab(tab: Tab): void;
  /** `Skin`: Settings, scrolled to the Skin group, focus on the checked radio (retro-skin Requirement 6.4). */
  openSkin(): void;
  pin(on: boolean): void;
  windowAction(action: 'minimize' | 'close'): void;
}
const TOOL_ICONS: Readonly<Record<Tool, IconName>> = { list: 'tool-buddies', inbox: 'tool-inbox', settings: 'tool-settings', skin: 'tool-skin' };
const tools = () => TOOLS.map((t) => $<HTMLButtonElement>(`.tool[data-tool="${t}"]`));
/** The toolbar's tab stop (retro-skin Requirement 6.5); `lastTab` tells a screen change from a re-render. */
let rovingIndex = 0;
let lastTab: Tab | null = null;
function setRoving(index: number): void {
  rovingIndex = index;
  tools().forEach((b, i) => (b.tabIndex = i === index ? 0 : -1));
}
/** Wires the static buttons once. */
export function setupChrome(a: ChromeActions, app: boolean): void {
  document.body.classList.toggle('browser', !app);
  $('.tb-pin').addEventListener('click', () => a.pin($('.tb-pin').getAttribute('aria-pressed') !== 'true'));
  $('.tb-min').addEventListener('click', () => a.windowAction('minimize'));
  $('.tb-close').addEventListener('click', () => a.windowAction('close'));
  for (const b of tools()) {
    const tool = b.dataset['tool'] as Tool;
    b.addEventListener('click', () => (tool === 'skin' ? a.openSkin() : a.setTab(tool)));
  }
  // ←/→ wrap, Home/End: focus moves, nothing opens; Enter and Space are the buttons' own activation (Requirement 6.6).
  $('.toolbar').addEventListener('keydown', (e) => {
    const target = rovingTarget(e.key, rovingIndex, TOOLS.length);
    if (target === null) return;
    e.preventDefault();
    setRoving(target);
    tools()[target]!.focus();
  });
}
/** A decoration character drawn by CSS from a theme token (themes Requirement 4). */
function mark(cls: string): HTMLSpanElement {
  const m = el('span', cls);
  m.setAttribute('aria-hidden', 'true');
  return m;
}
let titleTheme: ThemeId | null = null;
export function renderChrome(s: AppSnapshot, tab: Tab, notice: string | undefined): void {
  const app = s.mode !== 'browser';
  if (titleTheme !== s.settings.theme) {
    titleTheme = s.settings.theme;
    $('.tb-sprite').replaceChildren(sprite(titleTheme, 'title', null, 16));
    // Blue Bot: no mark (S9); Strawberry Milk: the pixel strawberry (retro-skin Requirement 5.1).
    $('.title-mark').replaceChildren(...(titleTheme === 'strawberry-milk' ? [icon('berry', 12)] : []));
    for (const b of tools()) b.querySelector('.tool-icon')!.replaceChildren(icon(TOOL_ICONS[b.dataset['tool'] as Tool], 16));
  }
  // Title bar: the pin button belongs to the Buddies screen; every button is app-only (Requirement 5.9).
  const pin = $('.tb-pin');
  pin.hidden = !app || tab !== 'list';
  pin.setAttribute('aria-pressed', String(s.settings.alwaysOnTop));
  $('.tb-min').hidden = !app;
  $('.tb-close').hidden = !app;

  const strip = $('.alert-strip');
  const alert = app && tab === 'list' ? alertText(s.count) : null;
  strip.hidden = alert === null;
  if (alert !== null) strip.replaceChildren(mark('alert-mark'), el('span', undefined, alert));

  $('.toolbar').hidden = !app;
  const view = toolbarView(tab, lastTab, rovingIndex);
  lastTab = tab;
  rovingIndex = view.rovingIndex;
  tools().forEach((b, i) => {
    const vm = view.tools[i]!;
    if (vm.current) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
    b.tabIndex = vm.tabIndex;
  });
  const n = unreadCount(s.inbox);
  const count = $('.tool-count');
  count.hidden = n === 0;
  // Read as "Inbox, 2 unread"; the badge shows only the number (retro-skin Requirement 6.3).
  if (n > 0) count.replaceChildren(el('span', 'sr-only', ', '), String(n), el('span', 'sr-only', ' unread'));
  for (const [name, cls] of [
    ['list', '.screen-list'],
    ['inbox', '.screen-inbox'],
    ['settings', '.screen-settings'],
  ] as const) {
    $(cls).hidden = name !== tab;
  }

  const bar = $('.statusbar');
  const f = footer(s, tab, notice);
  bar.hidden = f === null;
  if (f === null) return;
  const parts: Node[] = [];
  if (f.dot !== undefined) {
    const dot = mark('relay-mark');
    dot.dataset['dot'] = f.dot;
    parts.push(dot);
  }
  parts.push(el('span', 'status-text', f.left));
  if (f.right !== undefined) parts.push(el('span', 'status-right', f.right));
  bar.replaceChildren(...parts);
}
