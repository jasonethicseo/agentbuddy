// The pop-up page. Plain for now; the look of Popup.dc.html comes in task 10.4.
// Agent text is inserted with textContent only.
import type { PopupContent } from '../../core/snapshot';

interface PopupBridge {
  onContent(cb: (c: PopupContent) => void): void;
  go(): void;
  close(): void;
  later(): void;
}

const bridge = (window as unknown as { agentbuddyPopup?: PopupBridge }).agentbuddyPopup;
const $ = (selector: string) => document.querySelector<HTMLElement>(selector);

function fill(c: PopupContent): void {
  const card = $('.card');
  if (card === null) return;
  if (c.kind === 'notice') {
    card.dataset['state'] = 'notice';
    $('.card-head')!.textContent = 'AgentBuddy';
    $('.phrase')!.textContent = c.text;
    for (const s of ['.card-time', '.card-who', '.card-detail']) $(s)!.textContent = '';
    for (const s of ['.card-later', '.card-go']) $(s)!.hidden = true;
    return;
  }
  card.dataset['state'] = c.state;
  $('.card-head')!.textContent = c.state === 'WAITING_APPROVAL' ? 'Ding! ♪ needs your OK' : 'Ding! ♪ new message';
  $('.card-time')!.textContent = c.time;
  $('.card-who')!.textContent = c.folder === '' ? c.agent : `${c.agent} @ ${c.folder}`;
  $('.phrase')!.textContent = c.phrase;
  $('.card-detail')!.textContent = c.detail ?? '';
}

if (bridge) {
  bridge.onContent(fill);
  document.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest('.card-close')) bridge.close();
    else if (target?.closest('.card-later')) bridge.later();
    else bridge.go(); // Go there →, or anywhere else on the card (Requirement 9.5)
  });
}
