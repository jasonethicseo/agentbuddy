// Cell texts of the minimal buddy list (Requirements 20.1–20.4, 20.8, 20.9).
import { describe, expect, it } from 'vitest';
import type { BuddyView, SessionView } from '../../src/core/buddies';
import { rowCells, sessionCells, sessionsText, visibleSessions } from '../../src/ui/screens/list';

const session = (id: string, state: SessionView['state'], extra: Partial<SessionView> = {}): SessionView => ({
  key: JSON.stringify(['kiro', '/Users/dev/demo', id]),
  session: id.slice(0, 8),
  state,
  lastAt: '2026-11-12T01:02:03.000Z',
  startedAt: '2026-11-12T01:00:00.000Z',
  ...extra,
});

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
    session('sess_ce19…', 'WORKING', { title: 'fix login', statusText: 'fix login' }),
    session('sess_0bcd…', 'IDLE', { title: '2. Change the line in hello.txt' }),
    session('sess_dcdb…', 'OFFLINE'),
  ],
};

describe('buddy row', () => {
  it('lists the columns in table order', () => {
    const cells = rowCells(base);
    expect(cells).toHaveLength(7);
    expect([cells[0], cells[1], cells[2], cells[3], cells[5], cells[6]]).toEqual([
      'Kiro @ demo', 'WORKING', 'fix login', 'task 4/12', '3 sessions (2 hidden)', '/Users/dev/demo',
    ]);
    expect(cells[4]).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('counts sessions without the hidden note while hidden sessions are shown, and in the singular', () => {
    expect(sessionsText(base, true)).toBe('3 sessions');
    expect(sessionsText({ ...base, sessions: [session('a', 'WORKING')] }, false)).toBe('1 session');
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
});

describe('session rows', () => {
  it('hides IDLE and OFFLINE sessions unless asked', () => {
    expect(visibleSessions(base, false).map((s) => s.state)).toEqual(['WORKING']);
    expect(visibleSessions(base, true).map((s) => s.state)).toEqual(['WORKING', 'IDLE', 'OFFLINE']);
  });

  it('also hides ENDED (logged off) sessions unless asked', () => {
    const withEnded = { ...base, sessions: [...base.sessions, session('aba1…', 'ENDED')] };
    expect(visibleSessions(withEnded, false).map((s) => s.state)).toEqual(['WORKING']);
    expect(sessionsText(withEnded, false)).toBe('4 sessions (3 hidden)');
  });

  it('shows the session name, state, status, time and short id', () => {
    const cells = sessionCells(session('sess_ce19…', 'STALE', { title: 'fix login', statusText: 'Done.' }));
    expect(cells).toHaveLength(7);
    expect([cells[0], cells[1], cells[2], cells[3], cells[5], cells[6]]).toEqual(['↳ fix login', '?', 'Done.', '', 'sess_ce1', '']);
  });

  it('falls back to the start time when the session has no name', () => {
    expect(sessionCells(session('e697…', 'WAITING_APPROVAL'))[0]).toMatch(/^↳ started \d{2}:\d{2}:\d{2}$/);
  });
});
