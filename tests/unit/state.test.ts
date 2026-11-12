import { describe, expect, it } from 'vitest';
import { applyEvent, pruneList, toBuddyView, toViews } from '../../src/core/buddies';
import type { BuddyList, BuddyView } from '../../src/core/buddies';
import type { AgentId, BuddyEvent, EventKind } from '../../src/core/event';
import { buddyKey } from '../../src/core/history';
import { normalize } from '../../src/core/normalize';
import { displayState } from '../../src/core/state';
import { FIXTURES } from '../fixtures/payloads';

const T0 = Date.parse('2026-11-12T01:00:00.000Z');
const MIN = 60_000;
const HOUR = 60 * MIN;
const at = (minute: number) => new Date(T0 + minute * MIN).toISOString();
const SPEC = '/Users/dev/demo/.kiro/specs/hello-file/tasks.md';

function ev(kind: EventKind, minute: number, extra: Partial<BuddyEvent> = {}): BuddyEvent {
  const e: BuddyEvent = { v: 1, agent: 'kiro', session: 'sess_ce19…', kind, at: at(minute), cwd: '/Users/dev/demo', ...extra };
  if ((kind === 'task_start' || kind === 'task_done') && !e.task) e.task = { name: '2. Change the line in hello.txt', specPath: SPEC };
  return e;
}

function run(events: BuddyEvent[]): BuddyList {
  let list: BuddyList = new Map();
  events.forEach((e, i) => (list = applyEvent(list, e, i + 1).list));
  return list;
}

function view(list: BuddyList, nowMs = T0, agent: AgentId = 'kiro', cwd = '/Users/dev/demo'): BuddyView {
  return toBuddyView(list.get(buddyKey(agent, cwd))!, null, nowMs)!;
}

describe('session state', () => {
  it('Kiro stop keeps the preceding prompt text', () => {
    const v = view(run([ev('prompt', 0, { text: 'fix login' }), ev('stop', 1)]), T0 + 2 * MIN);
    expect(v.state).toBe('TURN_DONE');
    expect(v.statusText).toBe('fix login');
  });

  it('a late prompt lands in its place', () => {
    const v = view(run([ev('stop', 2), ev('prompt', 1, { text: 'fix login' })]), T0 + 3 * MIN);
    expect([v.state, v.statusText, v.lastAt]).toEqual(['TURN_DONE', 'fix login', at(2)]);
  });

  it('breaks at ties by kind order, whatever the arrival order', () => {
    expect(view(run([ev('stop', 1), ev('prompt', 1)]), T0 + 2 * MIN).state).toBe('TURN_DONE');
    expect(view(run([ev('prompt', 1), ev('stop', 1)]), T0 + 2 * MIN).state).toBe('TURN_DONE');
  });

  it('Claude permission then idle leaves WAITING_APPROVAL (trap 3)', () => {
    const c = (kind: EventKind, m: number) => ev(kind, m, { agent: 'claude', session: 'e697…' });
    expect(view(run([c('prompt', 0), c('permission', 1)]), T0 + 2 * MIN, 'claude').state).toBe('WAITING_APPROVAL');
    expect(view(run([c('prompt', 0), c('permission', 1), c('idle', 5)]), T0 + 6 * MIN, 'claude').state).toBe('IDLE');
  });

  it('task_done keeps the state, and starts WORKING when it comes first', () => {
    expect(view(run([ev('task_done', 0)])).state).toBe('WORKING');
    expect(view(run([ev('stop', 0), ev('task_done', 1)]), T0 + 2 * MIN).state).toBe('TURN_DONE');
  });
});

describe('sessions under one buddy', () => {
  it('a session waiting for approval sets the buddy state, even when another session works later', () => {
    const c = (session: string, kind: EventKind, m: number, text?: string) =>
      ev(kind, m, { agent: 'claude', session, ...(text ? { text } : {}) });
    const list = run([
      c('e697…', 'prompt', 0, 'delete hello.txt'),
      c('e697…', 'permission', 1),
      c('e9a4…', 'prompt', 2, 'run ls'),
      c('e9a4…', 'stop', 3, 'I ran ls.'),
      c('e9a4…', 'prompt', 4, 'and again'),
    ]);
    const v = view(list, T0 + 5 * MIN, 'claude');
    expect(list.size).toBe(1);
    expect(v.state).toBe('WAITING_APPROVAL');
    expect(v.statusText).toBe('delete hello.txt');
    expect(v.lastAt).toBe(at(4));
    expect(v.sessions.map((s) => [s.session, s.state, s.title])).toEqual([
      ['e697…', 'WAITING_APPROVAL', 'delete hello.txt'],
      ['e9a4…', 'WORKING', 'run ls'],
    ]);
  });

  it('keeps the spec path across sessions and after 60 chat events push the task out of every window', () => {
    const chat = Array.from({ length: 60 }, (_, i) => ev(i % 2 ? 'stop' : 'prompt', 10 + i, { text: `turn ${i}` }));
    const list = run([ev('task_start', 0, { session: 'sess_0bcd…' }), ev('task_done', 1, { session: 'sess_0bcd…' }), ...chat]);
    const b = list.get(buddyKey('kiro', '/Users/dev/demo'))!;
    expect(b.sessions.size).toBe(2);
    expect(b.sessions.get(JSON.stringify(['kiro', '/Users/dev/demo', 'sess_ce19…']))!.window).toHaveLength(50);
    expect(b.specPath).toBe(SPEC);
  });

  it('splits folders and agents into separate buddies', () => {
    const list = run([ev('prompt', 0), ev('prompt', 1, { cwd: '/Users/dev/app' }), ev('stop', 2, { agent: 'codex', session: '01a1…' })]);
    expect(list.size).toBe(3);
  });
});

describe('session names', () => {
  it('uses the first prompt, cut to 40 code points, even when a task came first', () => {
    const list = run([ev('task_start', 0), ev('prompt', 1, { text: 'a'.repeat(60) }), ev('prompt', 2, { text: 'later' })]);
    expect(view(list).sessions[0]!.title).toBe('a'.repeat(39) + '…');
  });

  it('names a Codex session from firstInput (observed fixture)', () => {
    const fixture = FIXTURES.find((f) => f.id === 'codex-turn-complete')!;
    const event = normalize('codex', fixture.raw, at(0))!;
    expect(event.firstInput).toBe('delete hello.txt');
    expect(view(run([event]), T0, 'codex').sessions[0]!.title).toBe('delete hello.txt');
  });

  it('falls back to the first task name, then to no title with the start time', () => {
    expect(view(run([ev('task_start', 0, { session: 'sess_0bcd…' }), ev('stop', 1, { session: 'sess_0bcd…' })])).sessions[0]!.title)
      .toBe('2. Change the line in hello.txt');
    const claude = view(run([ev('permission', 3, { agent: 'claude', session: 'e697…' }), ev('stop', 4, { agent: 'claude', session: 'e697…' })]), T0, 'claude');
    expect(claude.sessions[0]!.title).toBeUndefined();
    expect(claude.sessions[0]!.startedAt).toBe(at(3));
  });
});

describe('time-based states', () => {
  const one = (kind: EventKind) => run([ev(kind, 0)]).get(buddyKey('kiro', '/Users/dev/demo'))!.sessions.values().next().value!.state;

  it.each([
    ['stop', 10 * MIN - 1, 'TURN_DONE'],
    ['stop', 10 * MIN, 'IDLE'],
    ['prompt', 10 * MIN - 1, 'WORKING'],
    ['prompt', 10 * MIN, 'STALE'],
    ['permission', 10 * MIN, 'STALE'],
    ['idle', 10 * MIN, 'IDLE'],
    ['prompt', 30 * MIN - 1, 'STALE'],
    ['prompt', 30 * MIN, 'OFFLINE'],
    ['stop', 30 * MIN, 'OFFLINE'],
    ['prompt', -5 * MIN, 'WORKING'],
  ] as const)('%s after %i ms shows %s', (kind, age, shown) => {
    expect(displayState(one(kind), T0 + age)).toBe(shown);
  });
});

describe('removal after 24 hours', () => {
  it('keeps a session at exactly 24 h and removes it 1 ms later', () => {
    const list = run([ev('stop', 0)]);
    expect(pruneList(list, T0 + 24 * HOUR)).toBe(list);
    expect(pruneList(list, T0 + 24 * HOUR + 1).size).toBe(0);
  });

  it('removes only the old session, and the latest task event once it is older than 24 h', () => {
    const list = run([ev('task_start', 0, { session: 'sess_0bcd…' }), ev('prompt', 20 * 60, { text: 'still chatting' })]);
    const pruned = pruneList(list, T0 + 25 * HOUR);
    const b = pruned.get(buddyKey('kiro', '/Users/dev/demo'))!;
    expect([...b.sessions.values()].map((s) => s.state.session)).toEqual(['sess_ce19…']);
    expect(b.lastTask).toBeUndefined();
    expect(b.specPath).toBeUndefined();
    expect(pruneList(list, T0 + 23 * HOUR)).toBe(list);
  });
});

describe('views', () => {
  it('sorts buddies by name and gives progress to Kiro only', () => {
    const list = run([
      ev('task_start', 0),
      ev('prompt', 0, { agent: 'claude', session: 'e697abcdef', text: 'hi' }),
      ev('stop', 0, { agent: 'codex', session: '01a1…' }),
      ev('prompt', 0, { cwd: '/Users/dev/app' }),
    ]);
    const views = toViews(list, new Map([[buddyKey('kiro', '/Users/dev/demo'), { done: 3, total: 12 }]]), T0);
    expect(views.map((v) => v.name)).toEqual(['Claude Code @ demo', 'Codex @ demo', 'Kiro @ app', 'Kiro @ demo']);
    expect(views[0]).not.toHaveProperty('progress');
    expect(views[0]!.sessions[0]!.session).toBe('e697abcd');
    expect(views[2]!.progress).toBeNull(); // no spec path yet
    expect(views[3]!.progress).toEqual({ done: 3, total: 12 });
  });
});
