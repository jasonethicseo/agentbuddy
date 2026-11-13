// The Buddies screen: folder groups, buddy rows, session rows and the hidden-sessions line
// (messenger-app Requirement 6; themes Requirements 4, 6, 7.2, 7.3; retro-skin Requirement 7). Built from model/list.ts with createElement
// and textContent only; sprites and decoration characters follow the theme.
import type { ThemeId } from '../../core/theme';
import { button, el } from '../dom';
import { icon } from '../sprites/icons';
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

/**
 * The skin's unread marker (retro-skin Requirements 4.6, 4.7): Blue Bot's `N` tag, drawn by CSS, then `unread` for
 * screen readers; Strawberry Milk's pixel strawberry, an image named `new`. Shared with the inbox.
 */
export function unreadMark(theme: ThemeId): Node[] {
  if (theme === 'strawberry-milk') {
    const m = el('span', 'unread-mark berry');
    m.setAttribute('role', 'img');
    m.setAttribute('aria-label', 'new');
    m.append(icon('berry', 12));
    return [m];
  }
  const m = el('span', 'unread-mark');
  m.setAttribute('aria-hidden', 'true');
  return [m, el('span', 'sr-only', 'unread')];
}

/** Blue Bot draws the cells and Strawberry Milk the bar (tokens); without cells both draw the bar. */
/** Line 3 of a Kiro buddy row: the track (hidden from screen readers), then `n/m` as text. */
function progressBlock(p: ProgressVM): HTMLElement {
  const block = el('div', 'progress');
  const track = el('div', 'progress-track');
  track.setAttribute('aria-hidden', 'true');
  if (p.cells !== undefined) {
    const cells = el('div', 'progress-cells');
    cells.style.setProperty('--cells', String(p.cells.length)); // CSSOM, which the CSP allows
    for (const c of p.cells) {
      const cell = el('span', 'cell');
      cell.dataset['cell'] = c;
      cells.append(cell);
    }
    track.append(cells);
  } else {
    block.dataset['bar'] = '';
  }
  const bar = el('div', 'progress-bar');
  const fill = el('div', 'progress-fill');
  fill.style.width = `${Math.round((p.ratio ?? 0) * 1000) / 10}%`;
  bar.append(fill);
  track.append(bar);
  block.append(track, el('span', 'progress-text', p.text));
  return block;
}

function buddyBlock(theme: ThemeId, vm: BuddyVM, interactive: boolean, selected: string | null, a: ListActions): HTMLElement {
  const block = el('div', 'buddy');
  block.dataset['state'] = vm.state;
  const line = el('div', 'buddy-line');
  const main = rowMain('buddy-main', interactive, () => a.click('buddy', vm.key), `b:${vm.key}`);
  if (vm.key === selected) main.dataset['selected'] = ''; // the row clicked last (retro-skin Requirement 7.6)
  // Hover: the excerpt (none while hide-text is on), and for Codex its note (layout change, 2026-11-13).
  const tip = [vm.tooltip, vm.hover].filter((t) => t !== undefined).join('\n');
  if (tip !== '') main.title = tip;
  main.dataset['lines'] = vm.parts.excerpt !== undefined ? '2' : '1';
  // Line 1: name and [n] at full width, the phrase cut first, then age and the unread marker at the right end.
  const top = el('span', 'buddy-top');
  top.append(el('span', 'buddy-name', vm.name));
  if (vm.count !== undefined) top.append(el('span', 'buddy-count', `[${vm.count}]`));
  const phrase = el('span', 'buddy-phrase');
  if (vm.parts.lead === 'work') phrase.append(leadWork());
  phrase.append(vm.parts.phrase);
  const end = el('span', 'buddy-end');
  end.append(el('span', 'buddy-age', vm.age));
  if (vm.unread) end.append(...unreadMark(theme));
  top.append(phrase, end);
  main.append(...stateSprite(theme, vm.agent, vm.state, 24), top);
  // Line 2: the excerpt, at full width under the name; no line without one.
  if (vm.parts.excerpt !== undefined) main.append(el('span', 'buddy-excerpt', vm.parts.excerpt));
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
  // `[−]` / `[+]` as pixel boxes (Galmuri11 Bold has no −); `(online/total)`, with `online` for screen readers.
  const caret = el('span', 'caret');
  caret.setAttribute('aria-hidden', 'true');
  caret.append(icon(g.open ? 'box-open' : 'box-closed', 9));
  const count = el('span', 'group-count', g.kind === 'folder' ? `(${g.online}/${g.total})` : `(${g.total})`);
  if (g.kind === 'folder') count.append(el('span', 'sr-only', ' online'));
  head.append(caret, el('span', 'group-name', g.label), count);
  return head;
}

export function renderList(
  root: HTMLElement,
  theme: ThemeId,
  groups: readonly GroupVM[],
  interactive: boolean,
  selected: string | null,
  a: ListActions,
): void {
  const parts: Node[] = [];
  for (const g of groups) {
    parts.push(groupHead(g, a));
    if (g.open) for (const vm of g.buddies) parts.push(buddyBlock(theme, vm, interactive, selected, a));
  }
  root.replaceChildren(...(parts.length > 0 ? parts : [el('p', 'empty', 'No buddies yet. Agents show up here after their next hook event.')]));
}
