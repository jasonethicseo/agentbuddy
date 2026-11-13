// The Buddies tab: folder groups, buddy rows, session rows and the hidden-sessions line
// (messenger-app Requirement 6; themes Requirements 4, 6, 7.2, 7.3). Built from model/list.ts with createElement
// and textContent only; sprites and decoration characters follow the theme.
import type { ThemeId } from '../../core/theme';
import { button, el } from '../dom';
import { stateSprite } from '../sprites/render';
import type { BuddyVM, GroupVM, SessionVM } from '../model/list';
import type { ProgressVM } from '../model/progress';
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

/** The theme's working glyph, drawn by CSS from a token, never a text node (themes Requirement 4). */
function leadWork(): HTMLElement {
  const g = el('span', 'lead-work');
  g.setAttribute('aria-hidden', 'true');
  return g;
}

function statusSpan(vm: BuddyVM): HTMLElement {
  const s = el('span', 'buddy-status');
  const phrase = el('span', 'phrase');
  if (vm.parts.lead === 'work') phrase.append(leadWork());
  phrase.append(vm.parts.phrase);
  s.append('(', phrase);
  if (vm.parts.excerpt !== undefined) s.append(el('span', 'excerpt', ` · ${vm.parts.excerpt}`));
  s.append(')');
  return s;
}

function sessionPhrase(s: SessionVM): HTMLElement {
  const p = el('span', 'session-phrase');
  p.append('(');
  if (s.lead === 'work') p.append(leadWork());
  p.append(s.phrase, ')');
  return p;
}

function sessionRow(theme: ThemeId, agent: BuddyVM['agent'], s: SessionVM, interactive: boolean, a: ListActions): HTMLElement {
  const row = el('div', 'session');
  row.dataset['state'] = s.state;
  if (s.top) row.dataset['top'] = '';
  const tree = el('span', 'tree', s.tree);
  tree.setAttribute('aria-hidden', 'true');
  const main = rowMain('session-main', interactive, () => a.click('session', s.key), `s:${s.key}`);
  main.append(...stateSprite(theme, agent, s.state, 12), el('span', 'session-name', s.name), ' ', sessionPhrase(s), ' ', el('span', 'session-age', s.age));
  if (s.unread) main.append(el('span', 'sr-only', 'unread'));
  row.append(tree, main);
  if (s.canHide) {
    const x = button('session-hide', '×', () => a.hide(s.key), `x:${s.key}`);
    x.setAttribute('aria-label', 'Hide this session');
    row.append(x);
  }
  return row;
}

/** The theme's unread marker (`N` tag or `♥`), drawn by CSS, then `unread` for screen readers. */
function unreadMark(): Node[] {
  const m = el('span', 'unread-mark');
  m.setAttribute('aria-hidden', 'true');
  return [m, el('span', 'sr-only', 'unread')];
}

/** Blue Bot draws the cells and Strawberry Milk the bar (tokens); without cells both draw the bar. */
function progressBlock(p: ProgressVM): HTMLElement {
  const block = el('div', 'progress');
  block.setAttribute('aria-hidden', 'true');
  if (p.cells !== undefined) {
    const cells = el('div', 'progress-cells');
    cells.style.setProperty('--cells', String(p.cells.length)); // CSSOM, which the CSP allows
    for (const c of p.cells) {
      const cell = el('span', 'cell');
      cell.dataset['cell'] = c;
      cells.append(cell);
    }
    block.append(cells);
  } else {
    block.dataset['bar'] = '';
  }
  const bar = el('div', 'progress-bar');
  const fill = el('div', 'progress-fill');
  fill.style.width = `${Math.round((p.ratio ?? 0) * 1000) / 10}%`;
  bar.append(fill);
  block.append(bar);
  return block;
}

function buddyBlock(theme: ThemeId, vm: BuddyVM, interactive: boolean, a: ListActions): HTMLElement {
  const block = el('div', 'buddy');
  block.dataset['state'] = vm.state;
  const line = el('div', 'buddy-line');
  const main = rowMain('buddy-main', interactive, () => a.click('buddy', vm.key), `b:${vm.key}`);
  if (vm.hover !== undefined) main.title = vm.hover;
  main.append(...stateSprite(theme, vm.agent, vm.state, 24), el('span', 'buddy-name', vm.name));
  if (vm.count !== undefined) main.append(' ', el('span', 'buddy-count', `[${vm.count}]`));
  main.append(' ', statusSpan(vm));
  if (vm.progress !== undefined) main.append(el('span', 'progress-text', vm.progress.text));
  if (vm.unread) main.append(...unreadMark());
  line.append(main);
  if (vm.hide !== undefined) {
    const key = vm.hide;
    const x = button('buddy-hide', '×', () => a.hide(key), `x:${key}`);
    x.setAttribute('aria-label', 'Hide this session');
    line.append(x);
  }
  block.append(line);
  if (vm.progress?.ratio !== undefined) block.append(progressBlock(vm.progress));
  for (const s of vm.sessions) block.append(sessionRow(theme, vm.agent, s, interactive, a));
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

export function renderList(root: HTMLElement, theme: ThemeId, groups: readonly GroupVM[], interactive: boolean, a: ListActions): void {
  const parts: Node[] = [];
  for (const g of groups) {
    parts.push(groupHead(g, a));
    if (g.open) for (const vm of g.buddies) parts.push(buddyBlock(theme, vm, interactive, a));
  }
  root.replaceChildren(...(parts.length > 0 ? parts : [el('p', 'empty', 'No buddies yet. Agents show up here after their next hook event.')]));
}
