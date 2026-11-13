// The Buddies tab: folder groups, buddy rows, session rows and the hidden-sessions line
// (messenger-app Requirement 6). Built from model/list.ts with createElement and textContent only.
import { stateIcon } from '../icons';
import { button, el } from '../dom';
import type { BuddyVM, GroupVM, SessionVM } from '../model/list';
import type { ClickTarget } from '../../core/snapshot';

export interface ListActions {
  click(kind: ClickTarget['kind'], key: string): void;
  hide(session: string): void;
  setGroupOpen(key: string, open: boolean): void;
  toggleMore(buddy: string): void;
}

/** A clickable row in the app; a plain block in the browser, where nothing is clickable. */
function rowMain(cls: string, interactive: boolean, onClick: () => void, focusId: string): HTMLElement {
  if (!interactive) return el('div', cls);
  return button(cls, '', onClick, focusId);
}

function statusSpan(vm: BuddyVM): HTMLElement {
  const s = el('span', 'buddy-status');
  s.append('(', el('span', 'phrase', vm.parts.phrase));
  if (vm.parts.excerpt !== undefined) s.append(el('span', 'excerpt', ` · ${vm.parts.excerpt}`));
  s.append(')');
  return s;
}

function sessionRow(s: SessionVM, interactive: boolean, a: ListActions): HTMLElement {
  const row = el('div', 'session');
  row.dataset['state'] = s.state;
  if (s.top) row.dataset['top'] = '';
  const tree = el('span', 'tree', s.tree);
  tree.setAttribute('aria-hidden', 'true');
  const main = rowMain('session-main', interactive, () => a.click('session', s.key), `s:${s.key}`);
  main.append(...stateIcon(s.state, 12), el('span', 'session-name', s.name), ' ', el('span', 'session-phrase', `(${s.phrase})`), ' ', el('span', 'session-age', s.age));
  if (s.unread) main.append(el('span', 'sr-only', 'unread'));
  row.append(tree, main);
  if (s.canHide) {
    const x = button('session-hide', '×', () => a.hide(s.key), `x:${s.key}`);
    x.setAttribute('aria-label', 'Hide this session');
    row.append(x);
  }
  return row;
}

function buddyBlock(vm: BuddyVM, interactive: boolean, a: ListActions): HTMLElement {
  const block = el('div', 'buddy');
  block.dataset['state'] = vm.state;
  const line = el('div', 'buddy-line');
  const main = rowMain('buddy-main', interactive, () => a.click('buddy', vm.key), `b:${vm.key}`);
  if (vm.hover !== undefined) main.title = vm.hover;
  main.append(...stateIcon(vm.state, 14), el('span', 'buddy-name', vm.name));
  if (vm.count !== undefined) main.append(' ', el('span', 'buddy-count', `[${vm.count}]`));
  main.append(' ', statusSpan(vm));
  if (vm.progress !== undefined) main.append(el('span', 'progress-text', vm.progress.text));
  if (vm.unread) {
    const dot = el('span', 'unread-dot');
    dot.setAttribute('aria-hidden', 'true');
    main.append(dot, el('span', 'sr-only', 'unread'));
  }
  line.append(main);
  if (vm.hide !== undefined) {
    const key = vm.hide;
    const x = button('buddy-hide', '×', () => a.hide(key), `x:${key}`);
    x.setAttribute('aria-label', 'Hide this session');
    line.append(x);
  }
  block.append(line);
  if (vm.progress?.ratio !== undefined) {
    const bar = el('div', 'progress');
    bar.setAttribute('aria-hidden', 'true');
    const fill = el('div', 'progress-fill');
    fill.style.width = `${Math.round(vm.progress.ratio * 1000) / 10}%`; // CSSOM, which the CSP allows
    bar.append(fill);
    block.append(bar);
  }
  for (const s of vm.sessions) block.append(sessionRow(s, interactive, a));
  if (vm.more !== undefined) {
    const more = el('div', 'more');
    more.append(el('span', 'more-text', `${vm.more.text} · `), button('more-toggle', vm.more.shown ? 'hide' : 'show', () => a.toggleMore(vm.key), `m:${vm.key}`));
    block.append(more);
  }
  return block;
}

function groupHead(g: GroupVM, a: ListActions): HTMLButtonElement {
  const head = button('group-head', '', () => a.setGroupOpen(g.toggle.key, g.toggle.open), `g:${g.id}`);
  head.dataset['kind'] = g.kind;
  head.setAttribute('aria-expanded', String(g.open));
  if (g.path !== undefined) head.title = g.path;
  const caret = el('span', 'caret', g.open ? '▼' : '▶');
  caret.setAttribute('aria-hidden', 'true');
  const count = g.kind === 'folder' ? `(${g.online}/${g.total} online)` : `(${g.total})`;
  head.append(caret, ' ', el('span', 'group-name', g.label), ' ', el('span', 'group-count', count));
  return head;
}

export function renderList(root: HTMLElement, groups: readonly GroupVM[], interactive: boolean, a: ListActions): void {
  const parts: Node[] = [];
  for (const g of groups) {
    parts.push(groupHead(g, a));
    if (g.open) for (const vm of g.buddies) parts.push(buddyBlock(vm, interactive, a));
  }
  root.replaceChildren(...(parts.length > 0 ? parts : [el('p', 'empty', 'No buddies yet. Agents show up here after their next hook event.')]));
}
