// detectPings (messenger-app Requirements 8.1–8.3, 17.1).
import { describe, expect, it } from 'vitest';
import { detectPings } from '../../src/core/pings';
import type { DisplayState } from '../../src/core/state';
import { buddyView, key } from '../fixtures/views';

const CLAUDE = key('claude', 'e697…');
const CLAUDE_2 = key('claude', '81fd…');
const KIRO = key('kiro', 'sess_ce19…');
const CODEX = key('codex', '01a1…');

const claudeList = (a: DisplayState, b?: DisplayState) =>
  [buddyView('claude', '/Users/dev/demo', [{ key: CLAUDE, state: a, title: 'fix login', statusText: 'delete hello.txt?' }, ...(b ? [{ key: CLAUDE_2, state: b }] : [])])];

describe('detectPings', () => {
  it('never pings on a baseline list (no previous list), such as a restored list after a reconnect', () => {
    expect(detectPings(null, claudeList('WAITING_APPROVAL', 'TURN_DONE'))).toEqual([]);
  });

  it('does not ping when the same list arrives twice', () => {
    const list = claudeList('WAITING_APPROVAL', 'TURN_DONE');
    expect(detectPings(list, list)).toEqual([]);
    expect(detectPings(list, claudeList('WAITING_APPROVAL', 'TURN_DONE'))).toEqual([]);
  });

  it('pings again on a new turn: TURN_DONE → WORKING → TURN_DONE', () => {
    const states: DisplayState[] = ['WORKING', 'TURN_DONE', 'WORKING', 'TURN_DONE', 'TURN_DONE'];
    const lists = states.map((s) => claudeList(s));
    const counts = lists.slice(1).map((list, i) => detectPings(lists[i]!, list).length);
    expect(counts).toEqual([1, 0, 1, 0]);
  });

  it('pings when a waiting session finishes its turn, but not when it goes idle', () => {
    expect(detectPings(claudeList('WAITING_APPROVAL'), claudeList('TURN_DONE')).map((p) => p.state)).toEqual(['TURN_DONE']);
    expect(detectPings(claudeList('WAITING_APPROVAL'), claudeList('IDLE'))).toEqual([]);
    expect(detectPings(claudeList('TURN_DONE'), claudeList('STALE'))).toEqual([]);
  });

  it('pings for a new Codex session first seen in TURN_DONE', () => {
    const before = claudeList('WORKING');
    const after = [...before, buddyView('codex', '/Users/dev/demo', [{ key: CODEX, state: 'TURN_DONE', title: 'delete hello.txt', statusText: 'Created hello.txt.' }])];
    expect(detectPings(before, after)).toEqual([
      {
        session: CODEX,
        buddy: JSON.stringify(['codex', '/Users/dev/demo']),
        buddyName: 'Codex @ demo',
        state: 'TURN_DONE',
        title: 'delete hello.txt',
        statusText: 'Created hello.txt.',
        startedAt: '2026-11-12T05:00:00.000Z',
      },
    ]);
  });

  it('gives one ping per session when one list brings several, in list order', () => {
    const before = [...claudeList('WORKING', 'WORKING'), buddyView('kiro', '/Users/dev/app', [{ key: KIRO, state: 'WORKING' }])];
    const after = [...claudeList('WAITING_APPROVAL', 'TURN_DONE'), buddyView('kiro', '/Users/dev/app', [{ key: KIRO, state: 'TURN_DONE' }])];
    expect(detectPings(before, after).map((p) => [p.session, p.state, p.buddyName])).toEqual([
      [CLAUDE, 'WAITING_APPROVAL', 'Claude Code @ demo'],
      [CLAUDE_2, 'TURN_DONE', 'Claude Code @ demo'],
      [KIRO, 'TURN_DONE', 'Kiro @ app'],
    ]);
  });

  it('never pings for states other than WAITING_APPROVAL and TURN_DONE', () => {
    for (const s of ['WORKING', 'STALE', 'IDLE', 'OFFLINE', 'ENDED'] as DisplayState[]) {
      expect(detectPings([], claudeList(s))).toEqual([]);
    }
  });
});
