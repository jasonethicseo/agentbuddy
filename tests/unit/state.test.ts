import { describe, expect, it } from 'vitest';
import type { BuddyEvent, EventKind } from '../../src/core/event';
import { buddyKey } from '../../src/core/history';
import { applyEvent, displayState, toViews } from '../../src/core/state';
import type { BuddyList, BuddyState } from '../../src/core/state';

const T0 = Date.parse('2026-11-12T01:00:00.000Z');
const MIN = 60_000;

function ev(kind: EventKind, minute: number, extra: Partial<BuddyEvent> = {}): BuddyEvent {
  const e: BuddyEvent = {
    v: 1,
    agent: 'kiro',
    session: 'sess_ce19…',
    kind,
    at: new Date(T0 + minute * MIN).toISOString(),
    cwd: '/Users/dev/demo',
    ...extra,
  };
  if ((kind === 'task_start' || kind === 'task_done') && !e.task) {
    e.task = { name: '2. Change the line in hello.txt', specPath: '/Users/dev/demo/.kiro/specs/hello-file/tasks.md' };
  }
  return e;
}

function run(events: BuddyEvent[]): BuddyList {
  let list: BuddyList = new Map();
  events.forEach((e, i) => (list = applyEvent(list, e, i + 1).list));
  return list;
}

const kiro = (list: BuddyList, cwd = '/Users/dev/demo'): BuddyState => list.get(buddyKey('kiro', cwd))!.state;

describe('event-driven state', () => {
  it('Kiro stop keeps the preceding prompt text', () => {
    const b = kiro(run([ev('prompt', 0, { text: 'fix login' }), ev('stop', 1)]));
    expect(b.state).toBe('TURN_DONE');
    expect(b.statusText).toBe('fix login');
  });

  it('a late prompt lands in its place', () => {
    const b = kiro(run([ev('stop', 2), ev('prompt', 1, { text: 'fix login' })]));
    expect(b.state).toBe('TURN_DONE');
    expect(b.statusText).toBe('fix login');
    expect(b.lastAt).toBe(new Date(T0 + 2 * MIN).toISOString());
  });

  it('breaks at ties by kind order, whatever the arrival order', () => {
    expect(kiro(run([ev('stop', 1), ev('prompt', 1)])).state).toBe('TURN_DONE');
    expect(kiro(run([ev('prompt', 1), ev('stop', 1)])).state).toBe('TURN_DONE');
  });

  it('Claude permission then idle leaves WAITING_APPROVAL (trap 3)', () => {
    const c = (kind: EventKind, m: number) => ev(kind, m, { agent: 'claude', session: 'e697…' });
    const list = run([c('prompt', 0), c('permission', 1)]);
    expect(list.get(buddyKey('claude', '/Users/dev/demo'))!.state.state).toBe('WAITING_APPROVAL');
    const after = applyEvent(list, c('idle', 5), 3).list;
    expect(after.get(buddyKey('claude', '/Users/dev/demo'))!.state.state).toBe('IDLE');
  });

  it('task_done keeps the state, and starts WORKING when it comes first', () => {
    expect(kiro(run([ev('task_done', 0)])).state).toBe('WORKING');
    expect(kiro(run([ev('stop', 0), ev('task_done', 1)])).state).toBe('TURN_DONE');
    expect(kiro(run([ev('task_start', 0), ev('task_done', 1)])).statusText).toBe('2. Change the line in hello.txt');
  });

  it('keeps the spec path after 60 chat events push the task event out of the window', () => {
    const chat = Array.from({ length: 60 }, (_, i) => ev(i % 2 ? 'stop' : 'prompt', 10 + i, { text: `turn ${i}` }));
    const list = run([ev('task_start', 0, { session: 'sess_0bcd…' }), ev('task_done', 1, { session: 'sess_0bcd…' }), ...chat]);
    const record = list.get(buddyKey('kiro', '/Users/dev/demo'))!;
    expect(record.window.some((w) => w.event.kind.startsWith('task'))).toBe(false);
    expect(record.state.specPath).toBe('/Users/dev/demo/.kiro/specs/hello-file/tasks.md');
  });

  it('merges sessions of one agent and folder; splits folders and agents', () => {
    const list = run([
      ev('prompt', 0, { session: 'sess_ce19…' }),
      ev('task_start', 1, { session: 'sess_0bcd…' }),
      ev('prompt', 2, { cwd: '/Users/dev/app' }),
      ev('stop', 3, { agent: 'codex', session: '01a1…' }),
    ]);
    expect(list.size).toBe(3);
    expect(kiro(list).session).toBe('sess_0bcd…');
  });
});

describe('time-based states', () => {
  const at = (kind: EventKind) => kiro(run([ev(kind, 0)]));

  it.each([
    ['stop', 10 * MIN - 1, 'TURN_DONE'],
    ['stop', 10 * MIN, 'IDLE'],
    ['prompt', 10 * MIN - 1, 'WORKING'],
    ['prompt', 10 * MIN, 'STALE'],
    ['idle', 10 * MIN, 'IDLE'],
    ['prompt', 30 * MIN - 1, 'STALE'],
    ['prompt', 30 * MIN, 'OFFLINE'],
    ['stop', 30 * MIN, 'OFFLINE'],
    ['prompt', -5 * MIN, 'WORKING'],
  ] as const)('%s after %i ms shows %s', (kind, age, shown) => {
    expect(displayState(at(kind), T0 + age)).toBe(shown);
  });

  it('WAITING_APPROVAL goes STALE after 10 minutes', () => {
    const b = kiro(run([ev('permission', 0, { agent: 'kiro' })]));
    expect(displayState(b, T0 + 10 * MIN)).toBe('STALE');
  });
});

describe('views', () => {
  it('sorts by name, shortens sessions, and gives progress to Kiro only', () => {
    const list = run([
      ev('task_start', 0),
      ev('prompt', 0, { agent: 'claude', session: 'e697abcdef' }),
      ev('stop', 0, { agent: 'codex', session: '01a1…' }),
      ev('prompt', 0, { cwd: '/Users/dev/app' }),
    ]);
    const progress = new Map([[buddyKey('kiro', '/Users/dev/demo'), { done: 3, total: 12 }]]);
    const views = toViews(list, progress, T0);
    expect(views.map((v) => v.name)).toEqual(['Claude Code @ demo', 'Codex @ demo', 'Kiro @ app', 'Kiro @ demo']);
    expect(views[0]).not.toHaveProperty('progress');
    expect(views[0]!.session).toBe('e697abcd');
    expect(views[2]!.progress).toBeNull(); // no spec path yet
    expect(views[3]!.progress).toEqual({ done: 3, total: 12 });
  });
});
