// One test per row of the events.md mapping table (Requirement 21.3).
import { describe, expect, it } from 'vitest';
import { normalize } from '../../src/core/normalize';
import { ANYTHING_ELSE, FIXTURES } from '../fixtures/payloads';
import type { Fixture } from '../fixtures/payloads';

const AT = '2026-11-12T01:02:03.456Z';

function expectedEvent(f: Fixture) {
  return f.expected === null ? null : { v: 1, at: AT, ...f.expected };
}

describe('events.md mapping table', () => {
  it('covers all 15 rows', () => {
    const rows = new Set([...FIXTURES, ...ANYTHING_ELSE].map((f) => f.row));
    expect(rows.size).toBe(15);
  });

  it.each(FIXTURES.map((f) => [f.row, f] as const))('%s', (_row, f) => {
    expect(normalize(f.agent, f.raw, AT)).toEqual(expectedEvent(f));
  });

  it('Anything else or unparsable: dropped, never thrown', () => {
    for (const f of ANYTHING_ELSE) expect(normalize(f.agent, f.raw, AT)).toBeNull();
  });
});

describe('edge cases around the mapping', () => {
  const kiro = (o: object) => JSON.stringify({ session_id: 'sess_0bcd…', cwd: '/Users/dev/demo', ...o });
  const codex = (o: object) =>
    JSON.stringify({ type: 'agent-turn-complete', 'thread-id': '01a1…', cwd: '/Users/dev/demo', ...o });

  it('passes task_success false through and omits a missing one', () => {
    const base = { hook_event_name: 'PostTaskExec', spec_name: '/Users/dev/demo/.kiro/specs/a/tasks.md', task_name: '1. A' };
    expect(normalize('kiro', kiro({ ...base, task_success: false }), AT)?.task).toEqual({
      name: '1. A',
      specPath: '/Users/dev/demo/.kiro/specs/a/tasks.md',
      success: false,
    });
    expect(normalize('kiro', kiro(base), AT)?.task).toEqual({ name: '1. A', specPath: '/Users/dev/demo/.kiro/specs/a/tasks.md' });
    expect(normalize('kiro', kiro({ ...base, task_success: 'true' }), AT)?.task?.success).toBeUndefined();
  });

  it('drops Kiro task events without task_name or spec_name', () => {
    expect(normalize('kiro', kiro({ hook_event_name: 'PreTaskExec', task_name: '1. A' }), AT)).toBeNull();
    expect(normalize('kiro', kiro({ hook_event_name: 'PreTaskExec', spec_name: '/x/tasks.md', task_name: ' \n ' }), AT)).toBeNull();
  });

  it('keeps an event without text when the text field is blank or not a string', () => {
    const out = normalize('kiro', kiro({ hook_event_name: 'UserPromptSubmit', prompt: '  \n' }), AT);
    expect(out).not.toBeNull();
    expect(out).not.toHaveProperty('text');
    expect(normalize('codex', codex({ 'last-assistant-message': 42 }), AT)).not.toHaveProperty('text');
  });

  it('truncates long prompts to 120 code points', () => {
    const out = normalize('kiro', kiro({ hook_event_name: 'UserPromptSubmit', prompt: 'x'.repeat(500) }), AT);
    expect(Array.from(out?.text ?? '')).toHaveLength(120);
  });

  it('drops events without session or cwd', () => {
    expect(normalize('kiro', JSON.stringify({ hook_event_name: 'Stop', cwd: '/Users/dev/demo' }), AT)).toBeNull();
    expect(normalize('claude', JSON.stringify({ hook_event_name: 'Stop', session_id: 'e697…' }), AT)).toBeNull();
    expect(normalize('codex', codex({ cwd: '' }), AT)).toBeNull();
  });

  it('normalizes Claude Stop whatever stop_hook_active is', () => {
    const raw = JSON.stringify({ session_id: 'e9a4…', cwd: '/Users/dev/demo', hook_event_name: 'Stop', stop_hook_active: true });
    expect(normalize('claude', raw, AT)?.kind).toBe('stop');
  });

  it('keeps Codex replies that are not a JSON object with a title', () => {
    for (const reply of ['{"name":"Run ls"}', '["title"]', '"title"', 'title: Run ls', '{"title"']) {
      expect(normalize('codex', codex({ 'last-assistant-message': reply }), AT)?.text).toBe(reply);
    }
  });

  it('uses only the last Codex input message for the title signal', () => {
    const msgs = [`${'Generate a concise, single-line task title'} ...`, 'make hello.txt again'];
    expect(normalize('codex', codex({ 'input-messages': msgs, 'last-assistant-message': 'Done.' }), AT)).not.toBeNull();
  });

  it('keeps projectDir from CLAUDE_PROJECT_DIR on Claude events only', () => {
    const raw = FIXTURES.find((f) => f.id === 'claude-stop')!.raw;
    expect(normalize('claude', raw, AT, { projectDir: '/Users/dev/demo' })?.projectDir).toBe('/Users/dev/demo');
    expect(normalize('claude', raw, AT, { projectDir: '' })).not.toHaveProperty('projectDir');
    expect(normalize('claude', raw, AT)).not.toHaveProperty('projectDir');
    expect(normalize('kiro', FIXTURES[0]!.raw, AT, { projectDir: '/Users/dev/demo' })).not.toHaveProperty('projectDir');
  });

  it('takes firstInput from the first Codex input message, truncated', () => {
    const first = (msgs: unknown) => normalize('codex', codex({ 'input-messages': msgs, 'last-assistant-message': 'Done.' }), AT);
    expect(first(['delete hello.txt', 'make hello.txt again'])?.firstInput).toBe('delete hello.txt');
    expect(Array.from(first(['x'.repeat(300)])?.firstInput ?? '')).toHaveLength(120);
    expect(first(['  \n ', 'later'])).not.toHaveProperty('firstInput');
    expect(first([42, 'later'])).not.toHaveProperty('firstInput');
    expect(first([])).not.toHaveProperty('firstInput');
    expect(first('delete hello.txt')).not.toHaveProperty('firstInput');
  });

  it('rejects an unknown agent or a bad time', () => {
    const raw = FIXTURES[0]!.raw;
    expect(normalize('cursor' as never, raw, AT)).toBeNull();
    expect(normalize('kiro', raw, 'now')).toBeNull();
  });
});
