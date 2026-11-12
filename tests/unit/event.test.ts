import { describe, expect, it } from 'vitest';
import { validateEvent } from '../../src/core/event';

const base = {
  v: 1,
  agent: 'kiro',
  session: 'sess_0bcd…',
  kind: 'stop',
  at: '2026-11-12T01:02:03.456Z',
  cwd: '/Users/dev/demo',
} as const;

const task = { name: '2. Change the line in hello.txt', specPath: '/Users/dev/demo/.kiro/specs/hello-file/tasks.md' };

describe('validateEvent', () => {
  it('accepts a minimal event and returns a new object', () => {
    const out = validateEvent(base);
    expect(out).toEqual(base);
    expect(out).not.toBe(base);
  });

  it('keeps text and task', () => {
    expect(validateEvent({ ...base, kind: 'prompt', text: 'hello' })).toEqual({ ...base, kind: 'prompt', text: 'hello' });
    const done = { ...base, kind: 'task_done', task: { ...task, success: true } };
    expect(validateEvent(done)).toEqual(done);
  });

  it('drops unknown properties, and task on non-task kinds', () => {
    expect(validateEvent({ ...base, extra: 1, task })).toEqual(base);
    expect(validateEvent({ ...base, kind: 'task_start', task: { ...task, extra: 2 } })).toEqual({
      ...base,
      kind: 'task_start',
      task,
    });
  });

  it('requires task on task_start and task_done', () => {
    expect(validateEvent({ ...base, kind: 'task_start' })).toBeNull();
    expect(validateEvent({ ...base, kind: 'task_done', task: { name: 'x' } })).toBeNull();
    expect(validateEvent({ ...base, kind: 'task_done', task: { ...task, success: 'yes' } })).toBeNull();
  });

  it('keeps firstInput only on Codex stop events, at most 120 code points', () => {
    const codexStop = { ...base, agent: 'codex', session: '01a1…', firstInput: 'delete hello.txt' };
    expect(validateEvent(codexStop)?.firstInput).toBe('delete hello.txt');
    expect(validateEvent({ ...base, firstInput: 'x' })).not.toHaveProperty('firstInput');
    expect(validateEvent({ ...codexStop, kind: 'prompt' })).not.toHaveProperty('firstInput');
    expect(validateEvent({ ...codexStop, firstInput: 'a'.repeat(121) })).toBeNull();
    expect(validateEvent({ ...codexStop, firstInput: 7 })).toBeNull();
  });

  it('limits text and task.name to 120 code points', () => {
    expect(validateEvent({ ...base, text: '😀'.repeat(120) })).not.toBeNull();
    expect(validateEvent({ ...base, text: 'a'.repeat(121) })).toBeNull();
    expect(validateEvent({ ...base, text: '' })).toBeNull();
    expect(validateEvent({ ...base, kind: 'task_start', task: { ...task, name: 'a'.repeat(121) } })).toBeNull();
  });

  it.each([
    '2026-11-12T01:02:03Z',
    '2026-11-12T01:02:03.456+09:00',
  ])('accepts at = %s', (at) => {
    expect(validateEvent({ ...base, at })).not.toBeNull();
  });

  it.each([
    '2026-11-12',
    '2026-11-12T01:02:03',
    '2026-13-40T01:02:03Z',
    'yesterday',
    '',
    1_700_000_000_000,
  ])('rejects at = %j', (at) => {
    expect(validateEvent({ ...base, at })).toBeNull();
  });

  it('rejects wrong version, agent, kind, session and cwd', () => {
    expect(validateEvent({ ...base, v: 2 })).toBeNull();
    expect(validateEvent({ ...base, agent: 'cursor' })).toBeNull();
    expect(validateEvent({ ...base, kind: 'start' })).toBeNull();
    expect(validateEvent({ ...base, session: '' })).toBeNull();
    expect(validateEvent({ ...base, cwd: 42 })).toBeNull();
  });

  it('returns null for non-objects and hostile objects', () => {
    for (const value of [null, undefined, 'x', 1, [], [base]]) expect(validateEvent(value)).toBeNull();
    const hostile = Object.defineProperty({ ...base }, 'session', {
      get() {
        throw new Error('boom');
      },
    });
    expect(validateEvent(hostile)).toBeNull();
  });
});
