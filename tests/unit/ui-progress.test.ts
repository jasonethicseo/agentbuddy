// Kiro progress on a buddy row: `n/m` keeps its meaning; cells for Blue Bot, one bar above 30 tasks
// (themes Requirement 7.3, T9, decision D5).
import { describe, expect, it } from 'vitest';
import { buildGroups } from '../../src/ui/model/list';
import { PROGRESS_CELLS_MAX, progressCells, progressView } from '../../src/ui/model/progress';
import { T0, buddyView, key, snapshot } from '../fixtures/views';

describe('progress cells', () => {
  it('are m cells: n done, one current while working, the rest to do', () => {
    expect(progressCells(16, 19, 'WORKING')).toEqual([...Array(16).fill('done'), 'current', 'todo', 'todo']);
    expect(progressCells(16, 19, 'TURN_DONE')).toEqual([...Array(16).fill('done'), 'todo', 'todo', 'todo']);
    expect(progressCells(0, 3, 'WORKING')).toEqual(['current', 'todo', 'todo']);
  });

  it('have no current cell when every task is done', () => {
    expect(progressCells(4, 4, 'WORKING')).toEqual(['done', 'done', 'done', 'done']);
  });

  it('give way to one bar above 30 tasks, and are absent for 0 tasks', () => {
    expect(PROGRESS_CELLS_MAX).toBe(30);
    expect(progressCells(10, 30, 'WORKING')).toHaveLength(30);
    expect(progressCells(10, 31, 'WORKING')).toBeUndefined();
    expect(progressCells(0, 0, 'WORKING')).toBeUndefined();
  });

  it('never disagree with n/m', () => {
    for (let total = 1; total <= 30; total++) {
      for (let done = 0; done <= total; done++) {
        for (const state of ['WORKING', 'IDLE'] as const) {
          const cells = progressCells(done, total, state)!;
          expect(cells).toHaveLength(total);
          expect(cells.filter((c) => c === 'done')).toHaveLength(done);
          expect(cells.filter((c) => c === 'current')).toHaveLength(state === 'WORKING' && done < total ? 1 : 0);
        }
      }
    }
  });
});

describe('progressView', () => {
  it('keeps the text and ratio of before, and adds cells', () => {
    expect(progressView({ done: 16, total: 19 }, 'WORKING')).toEqual({ text: '16/19', ratio: 16 / 19, cells: progressCells(16, 19, 'WORKING') });
    expect(progressView({ done: 3, total: 40 }, 'WORKING')).toEqual({ text: '3/40', ratio: 3 / 40 });
    expect(progressView({ done: 0, total: 0 }, 'IDLE')).toEqual({ text: '0/0', ratio: 0 });
    // Unknown progress shows neither `?/?` nor a bar (messenger-app bug fix, 2026-11-13).
    expect(progressView(null, 'WORKING')).toBeUndefined();
    expect(progressView(undefined, 'WORKING')).toBeUndefined();
  });

  it('reaches the Kiro buddy row, with the current cell following the buddy state', () => {
    const kiro = buddyView('kiro', '/Users/dev/agentbuddy', [{ key: key('kiro', 'sess_ce19…'), state: 'WORKING' }]);
    kiro.progress = { done: 2, total: 4 };
    const vm = buildGroups(snapshot([kiro], { mode: 'own' }), new Set(), { nowMs: T0, time: () => '00:00' })[0]!.buddies[0]!;
    expect(vm.progress).toEqual({ text: '2/4', ratio: 0.5, cells: ['done', 'done', 'current', 'todo'] });
  });
});
