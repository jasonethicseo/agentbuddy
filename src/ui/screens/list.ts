// Minimal text-only buddy list: one row per buddy, expandable to one row per
// session. Agent text is inserted with textContent only.

import type { BuddyView, SessionView } from '../../core/buddies';
import type { DisplayState } from '../../core/state';

const COLUMNS = 7; // Buddy, State, Status, Progress, Last event, Sessions, Folder
const HIDDEN_BY_DEFAULT: readonly DisplayState[] = ['IDLE', 'OFFLINE'];

/** Per-buddy choices, kept across renders. */
export interface BuddyUiState {
  open: boolean;
  showHidden: boolean;
}

/** Progress cell: Kiro shows task n/m, Codex explains what it reports, Claude Code is empty. */
export function progressText(view: BuddyView): string {
  if (view.agent === 'kiro') {
    return view.progress ? `task ${view.progress.done}/${view.progress.total}` : 'progress unknown';
  }
  if (view.agent === 'codex') return 'Codex reports finished turns only';
  return '';
}

export function stateText(state: DisplayState): string {
  return state === 'STALE' ? '?' : state;
}

export function timeText(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-GB');
}

export function hiddenSessions(view: BuddyView): SessionView[] {
  return view.sessions.filter((s) => HIDDEN_BY_DEFAULT.includes(s.state));
}

/** Sessions shown when the buddy is open. */
export function visibleSessions(view: BuddyView, showHidden: boolean): SessionView[] {
  return showHidden ? view.sessions : view.sessions.filter((s) => !HIDDEN_BY_DEFAULT.includes(s.state));
}

/** `3 sessions (2 hidden)`; the hidden count is left out while hidden sessions are shown. */
export function sessionsText(view: BuddyView, showHidden: boolean): string {
  const n = view.sessions.length;
  const hidden = showHidden ? 0 : hiddenSessions(view).length;
  return `${n} ${n === 1 ? 'session' : 'sessions'}${hidden > 0 ? ` (${hidden} hidden)` : ''}`;
}

/** Buddy row cells in column order (the toggle button is added in front of the name). */
export function rowCells(view: BuddyView, showHidden = false): string[] {
  return [
    view.name,
    stateText(view.state),
    view.statusText ?? '',
    progressText(view),
    timeText(view.lastAt),
    sessionsText(view, showHidden),
    view.cwd,
  ].map((cell) => String(cell ?? ''));
}

/** Session row cells in column order. */
export function sessionCells(s: SessionView): string[] {
  const name = s.title ?? `started ${timeText(s.startedAt)}`;
  return [`↳ ${name}`, stateText(s.state), s.statusText ?? '', '', timeText(s.lastAt), s.session, ''].map((cell) =>
    String(cell ?? ''),
  );
}

function row(cells: string[]): HTMLTableRowElement {
  const tr = document.createElement('tr');
  for (const text of cells) {
    const td = document.createElement('td');
    td.textContent = text;
    tr.append(td);
  }
  return tr;
}

function button(label: string, onClick: () => void, expanded?: boolean): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  if (expanded !== undefined) b.setAttribute('aria-expanded', String(expanded));
  b.addEventListener('click', onClick);
  return b;
}

function wideRow(content: Node): HTMLTableRowElement {
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = COLUMNS;
  td.append(content);
  tr.append(td);
  return tr;
}

/** A list bound to one tbody. Expanded and show-hidden choices survive new lists. */
export function createBuddyList(tbody: HTMLTableSectionElement) {
  const ui = new Map<string, BuddyUiState>();
  let views: readonly BuddyView[] = [];

  const stateOf = (key: string): BuddyUiState => {
    let s = ui.get(key);
    if (!s) ui.set(key, (s = { open: false, showHidden: false }));
    return s;
  };

  function rowsFor(view: BuddyView): HTMLTableRowElement[] {
    const s = stateOf(view.key);
    const head = row(rowCells(view, s.showHidden));
    const toggle = button(s.open ? '−' : '+', () => ((s.open = !s.open), render(views)), s.open);
    head.cells[0]!.prepend(toggle, ' ');
    if (!s.open) return [head];

    const rows = [head, ...visibleSessions(view, s.showHidden).map((session) => row(sessionCells(session)))];
    const hidden = hiddenSessions(view).length;
    if (hidden > 0) {
      const label = s.showHidden ? 'hide idle/offline sessions' : `show ${hidden} idle/offline ${hidden === 1 ? 'session' : 'sessions'}`;
      rows.push(wideRow(button(label, () => ((s.showHidden = !s.showHidden), render(views)))));
    }
    return rows;
  }

  function render(next: readonly BuddyView[]): void {
    views = next.filter((v) => typeof v === 'object' && v !== null && Array.isArray(v.sessions));
    const rows = views.flatMap(rowsFor);
    tbody.replaceChildren(...(rows.length > 0 ? rows : [wideRow(document.createTextNode('No buddies yet'))]));
  }

  return { render };
}
