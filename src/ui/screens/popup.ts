// The pop-up page (messenger-app Requirements 9.1, 9.5, 9.7; themes Requirements 2.5, 7.4–7.6). Agent text goes
// in with textContent only. × closes and acknowledges, Later only closes, Go there or anywhere else on the card
// jumps, on both kinds (unchanged from the messenger-app spec).
import '../styles/themes.css';
import '../styles/sprites.css';
import '../styles/fonts.css';
import '../styles/materials.css';
import '../styles/popup.css';
import type { PopupContent } from '../../core/snapshot';
import type { ThemeId } from '../../core/theme';
import { parseTheme } from '../../core/theme';
import { el } from '../dom';
import { STATE_NAMES, stateSprite } from '../sprites/render';
import { applyTheme, applyThemeFromUrl } from '../theme';

applyThemeFromUrl(); // before the card is filled (themes Requirement 2.7)

interface PopupBridge {
  onContent(cb: (c: PopupContent) => void): void;
  /** A theme change while the pop-up is open (themes Requirement 2.5). */
  onTheme(cb: (t: ThemeId) => void): void;
  go(): void;
  close(): void;
  later(): void;
}

const bridge = (window as unknown as { agentbuddyPopup?: PopupBridge }).agentbuddyPopup;
const $ = (selector: string) => document.querySelector<HTMLElement>(selector)!;

/** The title, and the name screen readers read: `Ding!` in place of `띠링!`, without `♪` (themes Requirement 7.5). */
const TITLES = {
  WAITING_APPROVAL: { text: '띠링! ♪ needs your OK', label: 'Ding! needs your OK' },
  TURN_DONE: { text: '띠링! ♪ new message', label: 'Ding! new message' },
} as const;

let last: PopupContent | null = null;

function fill(c: PopupContent): void {
  last = c;
  const card = $('.card');
  const head = $('.card-head');
  if (c.kind === 'notice') {
    card.dataset['state'] = 'notice';
    head.textContent = 'AgentBuddy';
    head.removeAttribute('aria-label');
    $('.card-time').textContent = '';
    $('.card-icon').replaceChildren();
    $('.card-agent').textContent = '';
    $('.card-at').textContent = '';
    $('.phrase').textContent = c.text;
    $('.card-detail').textContent = '';
    $('.card-actions').hidden = true;
  } else {
    card.dataset['state'] = c.state;
    head.textContent = TITLES[c.state].text;
    head.setAttribute('aria-label', TITLES[c.state].label);
    $('.card-time').textContent = c.time;
    const theme = parseTheme(document.documentElement.dataset['theme']);
    $('.card-icon').replaceChildren(...(c.agentId !== undefined ? stateSprite(theme, c.agentId, c.state, 44) : [el('span', 'sr-only', STATE_NAMES[c.state])]));
    $('.card-agent').textContent = c.agent;
    $('.card-at').textContent = c.folder === '' ? '' : `@ ${c.folder}`;
    $('.phrase').textContent = c.phrase;
    $('.card-detail').textContent = c.detail ?? '';
    $('.card-detail').hidden = c.detail === undefined;
    $('.card-actions').hidden = false;
  }
  card.hidden = false;
}

if (bridge) {
  bridge.onContent(fill);
  // A theme change: the card is filled again in the new theme, without closing or moving (Requirement 2.5).
  bridge.onTheme((t) => {
    applyTheme(t);
    if (last !== null) fill(last);
  });
  document.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest('.card') === null || target === null) return;
    if (target.closest('.card-close')) bridge.close();
    else if (target.closest('.card-later')) bridge.later();
    else if ($('.card').dataset['state'] !== 'notice') bridge.go();
  });
}
