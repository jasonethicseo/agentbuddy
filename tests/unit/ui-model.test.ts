// UI models: buddy list, window chrome and inbox (messenger-app Requirements 5.10, 5.11, 6.1–6.12, 7, 11.3, 14.1, 17.1).
import { describe, expect, it } from 'vitest';
import type { InboxEntry } from '../../src/core/attention';
import { alertText, connections, statusPanels } from '../../src/ui/model/chrome';
import { agentOfKey, inboxHeader, inboxRows, unreadCount } from '../../src/ui/model/inbox';
import { OFFLINE_GROUP, age, buildGroups } from '../../src/ui/model/list';
import type { Clock } from '../../src/ui/model/list';
import { T0, buddyView, iso, key, snapshot } from '../fixtures/views';

const clock: Clock = { nowMs: T0 + 5 * 60_000, time: (ms, s) => new Date(ms).toISOString().slice(11, s ? 19 : 16) };
const A = key('claude', 'e697…');
const B = key('claude', '81fd…');
const C = key('claude', 'aba1…');
const K = key('kiro', 'sess_ce19…');
const X = key('codex', '01a1…');

const claude = (states: ['WAITING_APPROVAL' | 'WORKING' | 'TURN_DONE' | 'IDLE' | 'OFFLINE' | 'ENDED', ...string[]][], cwd = '/Users/dev/agentbuddy') =>
  buddyView('claude', cwd, states.map(([state, k, title]) => ({ key: k ?? A, state, ...(title ? { title } : {}) })));

describe('buddy list model', () => {
  const list = () => [
    buddyView('claude', '/Users/dev/agentbuddy', [
      { key: A, state: 'WAITING_APPROVAL', title: 'fix login', statusText: 'delete hello.txt?', last: 180 },
      { key: B, state: 'WORKING', title: 'add tests', last: 300 },
      { key: C, state: 'ENDED' },
    ]),
    buddyView('kiro', '/Users/dev/agentbuddy', [{ key: K, state: 'WORKING', statusText: '16. Kiro progress' }]),
    buddyView('codex', '/Users/dev/agentbuddy', [{ key: X, state: 'TURN_DONE', statusText: 'Created hello.txt.' }]),
    buddyView('claude', '/Users/dev/blueline', [{ key: key('claude', 'b1'), state: 'IDLE', title: 'deploy pages' }]),
    buddyView('kiro', '/Users/dev/old', [{ key: key('kiro', 'o1'), state: 'OFFLINE' }]),
    buddyView('codex', '/Users/dev/gone', [{ key: key('codex', 'g1'), state: 'ENDED' }]),
  ];

  it('groups by folder with online counts, buddies in agent order, and an offline group last', () => {
    const k = list();
    k[1]!.sessions[0]!.task = true;
    k[1]!.progress = { done: 16, total: 19 };
    const groups = buildGroups(snapshot(k, { unacked: [A, X] }), new Set(), clock);
    expect(groups.map((g) => [g.label, g.online, g.total, g.open])).toEqual([
      ['agentbuddy', 3, 3, true],
      ['blueline', 1, 1, true],
      ['offline', 0, 2, false],
    ]);
    const [kiro, cl, codex] = groups[0]!.buddies;
    expect([kiro!.name, cl!.name, codex!.name]).toEqual(['Kiro', 'Claude Code', 'Codex']);
    expect(kiro).toMatchObject({ parts: { phrase: 'studying hard', lead: 'work', excerpt: '16. Kiro progress' }, progress: { text: '16/19', ratio: 16 / 19 } });
    expect(cl).toMatchObject({ count: 2, unread: true, parts: { phrase: 'need your OK T_T', excerpt: 'delete hello.txt?' }, more: { text: '1 logged off', shown: false } });
    expect(cl!.sessions.map((s) => [s.tree, s.name, s.phrase, s.lead, s.age, s.top, s.unread])).toEqual([
      ['┗', 'fix login', 'need your OK T_T', undefined, '2m', true, true],
      ['┗', 'add tests', 'working…', 'work', 'now', false, false],
    ]);
    expect(codex).toMatchObject({ hover: 'Codex reports finished turns only', unread: true, parts: { phrase: '★ done~ your turn!' } });
    expect(groups[2]!.buddies.map((b) => b.name)).toEqual(['Codex @ gone', 'Kiro @ old']);
  });

  it('a buddy with one visible session has no session rows but a × for that session', () => {
    const [cl] = buildGroups(snapshot([claude([['TURN_DONE', A], ['IDLE', B]])]), new Set(), clock)[0]!.buddies;
    expect(cl).toMatchObject({ sessions: [], hide: A, more: { text: '1 idle', shown: false } });
    expect(cl).not.toHaveProperty('count');
  });

  it('show reveals the left-out sessions as rows; a buddy with all sessions quiet keeps its row', () => {
    const b = claude([['TURN_DONE', A], ['IDLE', B], ['ENDED', C]]);
    const [shown] = buildGroups(snapshot([b]), new Set([b.key]), clock)[0]!.buddies;
    expect(shown).toMatchObject({ count: 3, more: { text: '1 idle, 1 logged off', shown: true } });
    expect(shown!.sessions).toHaveLength(3);
    const [quiet] = buildGroups(snapshot([claude([['IDLE', A], ['IDLE', B]])]), new Set(), clock)[0]!.buddies;
    expect(quiet).toMatchObject({ sessions: [], more: { text: '2 idle' } });
    expect(quiet).not.toHaveProperty('hide');
  });

  it('counts sessions hidden with × apart, and still shows the buddy state they set', () => {
    const b = claude([['WAITING_APPROVAL', A, 'fix login'], ['WORKING', B]]);
    const [vm] = buildGroups(snapshot([b], { hidden: [A] }), new Set(), clock)[0]!.buddies;
    expect(vm).toMatchObject({ state: 'WAITING_APPROVAL', hide: B, more: { text: '1 hidden' } });
  });

  it('adds the parent folder when two groups share a folder name, and shows ?/? for unknown Kiro progress', () => {
    const groups = buildGroups(
      snapshot([buddyView('kiro', '/Users/dev/a/demo', [{ key: K, state: 'WORKING' }]), buddyView('kiro', '/Users/dev/b/demo', [{ key: key('kiro', 'k2'), state: 'WORKING' }])]),
      new Set(),
      clock,
    );
    expect(groups.map((g) => [g.label, g.path])).toEqual([
      ['demo (a)', '/Users/dev/a/demo'],
      ['demo (b)', '/Users/dev/b/demo'],
    ]);
    expect(groups[0]!.buddies[0]!.progress).toEqual({ text: '?/?' });
  });

  it('keeps group open state from settings; the offline group is open only when listed', () => {
    const s = snapshot(list(), {}, { closedGroups: ['/Users/dev/agentbuddy', OFFLINE_GROUP] });
    const groups = buildGroups(s, new Set(), clock);
    expect(groups.map((g) => [g.id, g.open, g.toggle])).toEqual([
      ['/Users/dev/agentbuddy', false, { key: '/Users/dev/agentbuddy', open: true }],
      ['/Users/dev/blueline', true, { key: '/Users/dev/blueline', open: false }],
      [OFFLINE_GROUP, true, { key: OFFLINE_GROUP, open: true }],
    ]);
  });

  it('hide-text leaves only phrases and start times', () => {
    const b = claude([['WAITING_APPROVAL', A, 'fix login'], ['WORKING', B, 'add tests']]);
    const [vm] = buildGroups(snapshot([b], {}, { hideText: true }), new Set(), clock)[0]!.buddies;
    expect(vm!.parts).toEqual({ phrase: 'need your OK T_T' });
    expect(vm!.sessions.map((s) => s.name)).toEqual(['started 05:00:00', 'started 05:00:00']);
  });

  it('in the browser draws no × and no unread dots', () => {
    const b = claude([['TURN_DONE', A], ['WORKING', B], ['IDLE', C]]);
    const [vm] = buildGroups(snapshot([b], { mode: 'browser', unacked: [] }), new Set(), clock)[0]!.buddies;
    expect(vm!.sessions.every((s) => !s.canHide && !s.unread)).toBe(true);
    const [one] = buildGroups(snapshot([claude([['TURN_DONE', A]])], { mode: 'browser' }), new Set(), clock)[0]!.buddies;
    expect(one).not.toHaveProperty('hide');
  });

  it('ages read now, minutes, then hours', () => {
    expect([age(iso(T0), T0 + 59_000), age(iso(T0), T0 + 60_000), age(iso(T0), T0 + 3_599_000), age(iso(T0), T0 + 7_200_000)]).toEqual(['now', '1m', '59m', '2h']);
  });
});

describe('window chrome model', () => {
  it('alert strip text', () => {
    expect(alertText({ waiting: 1, unreadTurns: 1, total: 2 })).toBe('1 needs your OK · 1 done, unread');
    expect(alertText({ waiting: 2, unreadTurns: 0, total: 2 })).toBe('2 need your OK');
    expect(alertText({ waiting: 0, unreadTurns: 3, total: 3 })).toBe('3 done, unread');
    expect(alertText({ waiting: 0, unreadTurns: 0, total: 0 })).toBeNull();
  });

  it('status bar panels per screen and connection: the footer texts, split (retro-skin Requirement 8)', () => {
    const s = snapshot([]);
    expect(statusPanels(s, 'list')).toEqual([{ dot: 'ok', text: 'relay connected', grow: true }, { text: 'local only' }, { text: 'on top', check: true }]);
    expect(statusPanels(snapshot([], {}, { alwaysOnTop: false }), 'list')).toEqual([{ dot: 'ok', text: 'relay connected', grow: true }, { text: 'local only' }]);
    expect(statusPanels(s, 'list', "can't tell which app this session is in")).toEqual([{ dot: 'alert', text: "can't tell which app this session is in", grow: true }, { text: 'on top', check: true }]);
    expect(statusPanels(s, 'inbox')).toEqual([{ text: 'kept on this computer only', grow: true }, { text: 'click a message to go there' }]);
    expect(statusPanels(s, 'settings')).toBeNull();
    const first = (x: ReturnType<typeof snapshot>) => statusPanels(x, 'list')![0]!.text;
    expect(first(snapshot([], { mode: 'connecting', connection: 'disconnected' }))).toBe('connecting to relay…');
    expect(first(snapshot([], { connection: 'disconnected' }))).toBe('relay disconnected');
    expect(first(snapshot([], { connection: 'foreign' }))).toBe('port 4343 is used by another program');
    expect(first(snapshot([], { connection: 'error', errorCode: 'EACCES' }))).toBe('relay error: EACCES');
    expect(statusPanels(snapshot([], { connection: 'disconnected' }), 'list')!.map((p) => p.text)).not.toContain('local only');
    expect(statusPanels(snapshot([], { mode: 'browser' }), 'list')!.map((p) => p.text)).toEqual(['relay connected', 'local only']);
  });

  it('connections card', () => {
    const s = snapshot([buddyView('kiro', '/Users/dev/a', [{ key: K, state: 'WORKING' }]), buddyView('codex', '/Users/dev/a', [{ key: X, state: 'OFFLINE' }])], { mode: 'own' });
    expect(connections(s)).toEqual([
      { dot: 'ok', text: 'Relay · 127.0.0.1:4343 · in this app' },
      { dot: 'ok', text: 'Kiro · hooks on' },
      { dot: 'muted', text: 'Claude Code · no events in 24 h' },
      { dot: 'idle', text: 'Codex · finished turns only' },
    ]);
    expect(connections(snapshot([]))[0]!.text).toBe('Relay · 127.0.0.1:4343 · attached');
  });
});

describe('inbox model', () => {
  const entry = (session: string, state: InboxEntry['state'], minute: number, acked: boolean, title?: string): InboxEntry => ({
    at: iso(T0 + minute * 60_000),
    session,
    buddyName: session === K ? 'Kiro @ agentbuddy' : 'Claude Code @ agentbuddy',
    startedAt: iso(T0),
    state,
    acked,
    ...(title ? { title } : {}),
  });
  const entries = [entry(K, 'TURN_DONE', 1, true, '15. session model'), entry(A, 'WAITING_APPROVAL', 2, false, 'fix login'), entry(B, 'TURN_DONE', 3, false)];

  it('lists newest first with need your OK / turn done lines', () => {
    expect(inboxRows(entries, false, clock)).toEqual([
      { session: B, state: 'TURN_DONE', agentId: 'claude', agent: 'Claude Code', folder: 'agentbuddy', line: 'turn done · started 05:00:00', time: '05:03', unread: true },
      { session: A, state: 'WAITING_APPROVAL', agentId: 'claude', agent: 'Claude Code', folder: 'agentbuddy', line: 'need your OK · fix login', time: '05:02', unread: true },
      { session: K, state: 'TURN_DONE', agentId: 'kiro', agent: 'Kiro', folder: 'agentbuddy', line: 'turn done · 15. session model', time: '05:01', unread: false },
    ]);
    expect(inboxHeader(entries)).toBe('Today · 2 unread');
    expect(unreadCount(entries)).toBe(2);
  });

  it('names the agent from the session key, for its sprite (themes Requirement 6.4)', () => {
    expect([agentOfKey(K), agentOfKey(A), agentOfKey('["codex","01a1…"]')]).toEqual(['kiro', 'claude', 'codex']);
    for (const bad of ['', 'kiro', '["mystery","x"]', '{"0":"kiro"}', '[1]', '[']) expect(agentOfKey(bad)).toBeUndefined();
  });
  it('hide-text shows start times instead of session names', () => {
    expect(inboxRows(entries, true, clock).map((r) => r.line)).toEqual(['turn done · started 05:00:00', 'need your OK · started 05:00:00', 'turn done · started 05:00:00']);
  });
});
