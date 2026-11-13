// The pop-up page (messenger-app Requirements 9.1, 9.5, 9.7). Agent text goes in with textContent only.
// × closes and acknowledges, Later only closes, Go there → or anywhere else on the card jumps.
import '../styles/tokens.css';
import '../styles/themes.css';
import '../styles/sprites.css';
import '../styles/fonts.css';
import '../styles/icons.css';
import '../styles/popup.css';
import type { PopupContent } from '../../core/snapshot';
import type { ThemeId } from '../../core/theme';
import { stateIcon } from '../icons';
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

function fill(c: PopupContent): void {
  const card = $('.card');
  if (c.kind === 'notice') {
    card.dataset['state'] = 'notice';
    $('.card-head').textContent = 'AgentBuddy';
    $('.card-time').textContent = '';
    $('.card-icon').replaceChildren();
    $('.card-agent').textContent = '';
    $('.card-at').textContent = '';
    $('.phrase').textContent = c.text;
    $('.card-detail').textContent = '';
    $('.card-actions').hidden = true;
  } else {
    card.dataset['state'] = c.state;
    $('.card-head').textContent = c.state === 'WAITING_APPROVAL' ? 'Ding! ♪ needs your OK' : 'Ding! ♪ new message';
    $('.card-time').textContent = c.time;
    $('.card-icon').replaceChildren(...stateIcon(c.state, 28));
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
  bridge.onTheme(applyTheme);
  document.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest('.card') === null || target === null) return;
    if (target.closest('.card-close')) bridge.close();
    else if (target.closest('.card-later')) bridge.later();
    else if ($('.card').dataset['state'] !== 'notice') bridge.go();
  });
}
