// Kiro progress on a buddy row (messenger-app Requirement 6.4; themes Requirement 7.3, T9). Pure.
// `n/m` keeps the app's meaning (done top-level tasks of counted ones, tech.md); only the drawing is new.
import type { Progress } from '../../core/buddies';
import type { DisplayState } from '../../core/state';

/** More tasks than this: one continuous bar instead of cells (decision D5). */
export const PROGRESS_CELLS_MAX = 30;

export type Cell = 'done' | 'current' | 'todo';

export interface ProgressVM {
  /** `n/m`. Unknown progress has no view at all: no `?/?` and no bar (messenger-app bug fix, 2026-11-13). */
  text: string;
  /** `n/m` as a number, when known. */
  ratio?: number;
  /** One cell per task, when `0 < m <= 30`; Blue Bot draws these, Strawberry Milk the bar. */
  cells?: Cell[];
}

/** `m` cells: `n` done, then one current cell while the buddy works and tasks remain, then to-do. */
export function progressCells(done: number, total: number, state: DisplayState): Cell[] | undefined {
  if (!(total > 0 && total <= PROGRESS_CELLS_MAX)) return undefined;
  const cells: Cell[] = [];
  for (let i = 0; i < total; i++) {
    if (i < done) cells.push('done');
    else if (i === done && state === 'WORKING') cells.push('current');
    else cells.push('todo');
  }
  return cells;
}

export function progressView(p: Progress | undefined, state: DisplayState): ProgressVM | undefined {
  if (p === null || p === undefined) return undefined;
  const vm: ProgressVM = { text: `${p.done}/${p.total}`, ratio: p.total > 0 ? p.done / p.total : 0 };
  const cells = progressCells(p.done, p.total, state);
  if (cells !== undefined) vm.cells = cells;
  return vm;
}
