// Cell texts of the minimal buddy list (Requirements 20.1–20.4).
import { describe, expect, it } from 'vitest';
import type { BuddyView } from '../../src/core/buddies';
import { rowCells } from '../../src/ui/screens/list';

const base: BuddyView = {
  key: '["kiro","/Users/dev/demo"]',
  agent: 'kiro',
  name: 'Kiro @ demo',
  cwd: '/Users/dev/demo',
  state: 'WORKING',
  statusText: 'fix login',
  lastAt: '2026-11-12T01:02:03.000Z',
  progress: { done: 4, total: 12 },
  sessions: [
    { key: '["kiro","/Users/dev/demo","sess_ce19…"]', session: 'sess_ce1', state: 'WORKING', lastAt: '2026-11-12T01:02:03.000Z', startedAt: '2026-11-12T01:00:00.000Z' },
  ],
};

describe('rowCells', () => {
  it('lists the columns in table order', () => {
    const cells = rowCells(base);
    expect(cells).toHaveLength(7);
    expect([cells[0], cells[1], cells[2], cells[3], cells[5], cells[6]]).toEqual([
      'Kiro @ demo', 'WORKING', 'fix login', 'task 4/12', 'sess_ce1', '/Users/dev/demo',
    ]);
    expect(cells[4]).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('shows ? for STALE', () => {
    expect(rowCells({ ...base, state: 'STALE' })[1]).toBe('?');
  });

  it('shows progress unknown for Kiro without progress', () => {
    expect(rowCells({ ...base, progress: null })[3]).toBe('progress unknown');
  });

  it('explains Codex, and leaves Claude Code progress empty', () => {
    const { progress: _, ...noProgress } = base;
    expect(rowCells({ ...noProgress, agent: 'codex', name: 'Codex @ demo', state: 'TURN_DONE' })[3]).toBe('Codex reports finished turns only');
    expect(rowCells({ ...noProgress, agent: 'claude', name: 'Claude Code @ demo' })[3]).toBe('');
  });

  it('keeps markup in agent text as plain text', () => {
    const cells = rowCells({ ...base, statusText: '<img src=x onerror=alert(1)>' });
    expect(cells[2]).toBe('<img src=x onerror=alert(1)>'); // inserted with textContent, never parsed
  });

  it('leaves the status empty when there is none', () => {
    const { statusText: _, ...noText } = base;
    expect(rowCells(noText)[2]).toBe('');
  });
});
