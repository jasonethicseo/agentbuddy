// Minimal text-only buddy list. Agent text is inserted with textContent only.

import type { BuddyView } from '../../core/state';

/** Progress cell: Kiro shows task n/m, Codex explains what it reports, Claude Code is empty. */
export function progressText(view: BuddyView): string {
  if (view.agent === 'kiro') {
    return view.progress ? `task ${view.progress.done}/${view.progress.total}` : 'progress unknown';
  }
  if (view.agent === 'codex') return 'Codex reports finished turns only';
  return '';
}

export function stateText(view: BuddyView): string {
  return view.state === 'STALE' ? '?' : view.state;
}

export function timeText(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-GB');
}

/** Cell texts in table column order: Buddy, State, Status, Progress, Last event, Session, Folder. */
export function rowCells(view: BuddyView): string[] {
  return [
    view.name,
    stateText(view),
    view.statusText ?? '',
    progressText(view),
    timeText(view.lastAt),
    view.session,
    view.cwd,
  ].map((cell) => String(cell ?? ''));
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

export function renderList(tbody: HTMLTableSectionElement, views: readonly BuddyView[]): void {
  const rows = views.filter((v) => typeof v === 'object' && v !== null).map((v) => row(rowCells(v)));
  if (rows.length === 0) {
    const tr = row(['No buddies yet']);
    tr.cells[0]!.colSpan = 7;
    rows.push(tr);
  }
  tbody.replaceChildren(...rows);
}
