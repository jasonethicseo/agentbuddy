// The window around the screens: title bar, alert strip, tabs and footer
// (messenger-app Requirements 5.9–5.11, 6.10). Fills the static parts of index.html.
import type { AppSnapshot } from '../core/snapshot';
import { bubbleIcon, stateIcon } from './icons';
import { el } from './dom';
import { alertText, footer } from './model/chrome';
import type { Tab } from './model/chrome';
import { unreadCount } from './model/inbox';

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

export interface ChromeActions {
  setTab(tab: Tab): void;
  pin(on: boolean): void;
  windowAction(action: 'minimize' | 'close'): void;
}

/** Wires the static buttons once. */
export function setupChrome(a: ChromeActions, app: boolean): void {
  $('.tb-bubble').replaceWith(bubbleIcon(16));
  document.body.classList.toggle('browser', !app);
  $('.tb-pin').addEventListener('click', () => a.pin($('.tb-pin').getAttribute('aria-pressed') !== 'true'));
  $('.tb-min').addEventListener('click', () => a.windowAction('minimize'));
  $('.tb-close').addEventListener('click', () => a.windowAction('close'));
  for (const t of document.querySelectorAll<HTMLButtonElement>('.tab')) {
    t.addEventListener('click', () => a.setTab(t.dataset['tab'] as Tab));
  }
}

export function renderChrome(s: AppSnapshot, tab: Tab, notice: string | undefined): void {
  const app = s.mode !== 'browser';
  // Title bar: the pin button belongs to the Buddies tab; every button is app-only (Requirement 5.9).
  const pin = $('.tb-pin');
  pin.hidden = !app || tab !== 'list';
  pin.setAttribute('aria-pressed', String(s.settings.alwaysOnTop));
  $('.tb-min').hidden = !app;
  $('.tb-close').hidden = !app;

  const strip = $('.alert-strip');
  const alert = app && tab === 'list' ? alertText(s.count) : null;
  strip.hidden = alert === null;
  if (alert !== null) strip.replaceChildren(...stateIcon('WAITING_APPROVAL', 14).slice(0, 1), el('span', undefined, alert));

  $('.tabs').hidden = !app;
  for (const t of document.querySelectorAll<HTMLButtonElement>('.tab')) {
    const on = t.dataset['tab'] === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    if (t.dataset['tab'] === 'inbox') {
      const n = unreadCount(s.inbox);
      const label: Node[] = [document.createTextNode('Inbox')];
      if (n > 0) label.push(document.createTextNode(' '), el('span', 'badge', String(n)), el('span', 'sr-only', ' unread'));
      t.replaceChildren(...label);
    }
  }
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
    const dot = el('span', 'dot');
    dot.dataset['dot'] = f.dot;
    dot.setAttribute('aria-hidden', 'true');
    parts.push(dot);
  }
  parts.push(el('span', 'status-text', f.left));
  if (f.right !== undefined) parts.push(el('span', 'status-right', f.right));
  bar.replaceChildren(...parts);
}
