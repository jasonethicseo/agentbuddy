// The "me" row between the title bar and the alert strip (messenger-app Requirement 18).
// A button shows the message; activating it opens a field: Enter saves, Esc or leaving cancels.
import { cleanMyStatus } from '../../core/text';
import { sprite } from '../sprites/render';
import { button, el } from '../dom';
import { MY_STATUS_HINT, limitStatusInput } from '../model/me';
import type { MeView } from '../model/me';

export interface MeActions {
  save(text: string): void;
}

/** While a field is open, re-renders leave the row alone, so typing survives new lists. */
let editing = false;
let shown: MeView | null = null;

function statusButton(root: HTMLElement, a: MeActions): HTMLButtonElement {
  const view = shown!;
  const b = button('me-status', '', () => startEdit(root, a), 'me-status');
  if (view.hint) b.dataset['hint'] = '';
  const pencil = el('span', 'me-pencil', ' ✎'); // `white-space: pre` keeps the space inside the flex button
  pencil.setAttribute('aria-hidden', 'true');
  b.append(el('span', 'sr-only', 'Edit my status message: '), el('span', 'me-status-text', view.hint ? MY_STATUS_HINT : view.text), pencil);
  return b;
}

function draw(root: HTMLElement, a: MeActions): HTMLButtonElement {
  const tile = sprite(shown!.theme, 'me', null, 36); // aria-hidden (Requirement 18.8)
  const text = el('div', 'me-text');
  const b = statusButton(root, a);
  text.append(el('span', 'me-name', 'me'), b);
  root.replaceChildren(tile, text);
  return b;
}

function startEdit(root: HTMLElement, a: MeActions): void {
  const slot = root.querySelector<HTMLElement>('.me-status');
  if (slot === null || shown === null) return;
  editing = true;
  const input = el('input', 'me-input');
  input.type = 'text';
  input.value = shown.text;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', 'My status message');
  let done = false;
  const finish = (save: boolean, refocus: boolean) => {
    if (done) return;
    done = true;
    editing = false;
    if (shown === null) return; // the row went away (another tab) while the field was open
    if (save) {
      const text = cleanMyStatus(input.value) ?? '';
      if (text !== shown!.text) {
        shown = { text, hint: text === '', theme: shown!.theme };
        a.save(text);
      }
    }
    const b = draw(root, a);
    if (refocus) b.focus();
  };
  input.addEventListener('input', () => {
    const limited = limitStatusInput(input.value);
    if (limited !== input.value) input.value = limited;
  });
  input.addEventListener('keydown', (e) => {
    if (e.isComposing) return; // Enter that ends a Korean (or other IME) composition does not save
    if (e.key === 'Enter') {
      e.preventDefault();
      finish(true, true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finish(false, true);
    }
  });
  input.addEventListener('blur', () => finish(false, false));
  slot.replaceWith(input);
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}

export function renderMe(root: HTMLElement, view: MeView | null, a: MeActions): void {
  root.hidden = view === null;
  if (view === null) {
    // Leaving the Buddies tab cancels an open edit.
    editing = false;
    shown = null;
    root.replaceChildren();
    return;
  }
  if (editing) return;
  shown = view;
  draw(root, a);
}
