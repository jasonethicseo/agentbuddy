// The demo scenario file: format, privacy, and only what each agent really reports
// (submission Requirements 3.2, 3.3; events.md mapping table and launcher table).
import { describe, expect, it } from 'vitest';
import type { EventKind } from '../../src/core/event';
import { parseScenario, stampEvents } from '../../src/demo/scenario';
import { START, rawScenario, scenario } from './demo-helpers';

/** The kinds each agent's observed mappings produce (events.md). */
const KINDS: Record<string, readonly EventKind[]> = {
  kiro: ['prompt', 'task_start', 'task_done', 'stop'],
  claude: ['prompt', 'permission', 'tool', 'idle', 'stop', 'end'],
  codex: ['stop'],
};

describe('demo/events.json', () => {
  const s = scenario();

  it('parses, every event is valid once stamped, and the end comes after the last event', () => {
    const stamped = stampEvents(s, START);
    expect(stamped.length).toBe(s.entries.length);
    expect(s.end).toBeGreaterThanOrEqual(s.entries.at(-1)!.t);
    expect(stamped[0]!.event.at).toBe(new Date(START + s.entries[0]!.t * 1000).toISOString());
  });

  it('uses only /Users/dev paths, short invented IDs, and no path in any text', () => {
    for (const { event } of s.entries) {
      for (const path of [event.cwd, event.projectDir, event.task?.specPath]) if (path !== undefined) expect(path).toMatch(/^\/Users\/dev\//);
      expect(event.session).toMatch(/^[A-Za-z0-9_]{1,8}…$/);
      for (const text of [event.text, event.firstInput, event.task?.name]) if (text !== undefined) expect(text).not.toContain('/');
    }
  });

  it('only has kinds each agent really sends: Kiro never asks for approval, Codex only finishes turns', () => {
    for (const { event } of s.entries) expect(KINDS[event.agent]).toContain(event.kind);
  });

  it('only has launchers seen in events.md: Kiro chat hooks, the Claude app; none on Kiro task runs or Codex', () => {
    for (const { event } of s.entries) {
      if (event.agent === 'claude') expect(event.bundleId).toBe('com.anthropic.claudefordesktop');
      else if (event.agent === 'kiro' && (event.kind === 'prompt' || event.kind === 'stop') && event.session === 'sess_k0…') expect(event.bundleId).toBe('dev.kiro.desktop');
      else expect(event.bundleId).toBeUndefined();
      expect(event.termProgram).toBeUndefined();
    }
  });
});

describe('parseScenario', () => {
  const good = rawScenario() as { v: number; end: number; events: unknown[] };

  it('lists the problems of a broken file and never throws', () => {
    for (const bad of [null, 'x', [], {}, { v: 2, events: [] }, { v: 1, end: 'soon', events: [] }]) expect(parseScenario(bad).ok).toBe(false);
    const withV = { ...good, events: [{ t: 1, event: { v: 1, agent: 'codex', session: 'a…', kind: 'stop', cwd: '/Users/dev/x' } }] };
    expect(parseScenario(withV).ok).toBe(false);
    const backwards = { ...good, events: [good.events[1], good.events[0]] };
    expect(parseScenario(backwards).ok).toBe(false);
    const badKind = { ...good, events: [{ t: 1, event: { agent: 'codex', session: 'a…', kind: 'nap', cwd: '/Users/dev/x' } }] };
    expect(parseScenario(badKind).ok).toBe(false);
    const codexProgress = { ...good, events: [{ t: 1, event: { agent: 'codex', session: 'a…', kind: 'stop', cwd: '/Users/dev/x' }, progress: { done: 1, total: 2 } }] };
    expect(parseScenario(codexProgress).ok).toBe(false);
    const tooMuch = { ...good, events: [{ t: 1, event: { agent: 'kiro', session: 'a…', kind: 'stop', cwd: '/Users/dev/x' }, progress: { done: 3, total: 2 } }] };
    expect(parseScenario(tooMuch).ok).toBe(false);
  });
});
