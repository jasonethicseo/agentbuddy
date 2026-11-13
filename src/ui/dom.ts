// Small DOM helpers. Agent text only ever goes in through `textContent`.

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls !== undefined) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** A `<button type="button">`; `focusId` lets the focus come back to it after a re-render. */
export function button(cls: string, text: string, onClick: () => void, focusId?: string): HTMLButtonElement {
  const b = el('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  if (focusId !== undefined) b.dataset['focus'] = focusId;
  return b;
}

/** Re-render `fill` while keeping keyboard focus on the element with the same `data-focus`. */
export function keepFocus(fill: () => void): void {
  const active = document.activeElement instanceof HTMLElement ? document.activeElement.dataset['focus'] : undefined;
  fill();
  if (active === undefined) return;
  for (const e of document.querySelectorAll<HTMLElement>('[data-focus]')) {
    if (e.dataset['focus'] === active) return e.focus();
  }
}
