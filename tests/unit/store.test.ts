// Restore on start from the daily logs (Requirements 17.1–17.5, 23.4, 23.8).
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { BuddyEvent } from '../../src/core/event';
import { logFileName } from '../../src/relay/home';
import { createStore } from '../../src/relay/store';

const HOUR = 3_600_000;
// A fixed local noon, so "yesterday" and "today" are plain calendar days in any time zone.
const NOW = new Date(2026, 10, 12, 12, 0, 0).getTime();
const YESTERDAY = new Date(2026, 10, 11, 12, 0, 0);
const at = (ms: number) => new Date(ms).toISOString();

const ev = (agent: BuddyEvent['agent'], session: string, kind: BuddyEvent['kind'], ms: number, extra: Partial<BuddyEvent> = {}): BuddyEvent => ({
  v: 1, agent, session, kind, at: at(ms), cwd: '/Users/dev/demo', ...extra,
});
const lines = (events: unknown[]) => events.map((e) => (typeof e === 'string' ? e : JSON.stringify(e))).join('\n');

let dir: string;
beforeEach(() => (dir = mkdtempSync(join(tmpdir(), 'agentbuddy-store-'))));
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('restore', () => {
  it('replays yesterday then today, keeps only the last 24 hours, and skips bad and cut-off lines', async () => {
    writeFileSync(
      join(dir, logFileName(YESTERDAY)),
      lines([
        ev('claude', 'old…', 'prompt', NOW - 30 * HOUR, { text: 'too old' }),
        ev('claude', 'e697…', 'prompt', NOW - 20 * HOUR, { text: 'delete hello.txt' }),
        ev('claude', 'e697…', 'permission', NOW - 20 * HOUR + 60_000),
      ]) + '\n',
    );
    writeFileSync(
      join(dir, logFileName(new Date(NOW))),
      lines([
        '{not json',
        { ...ev('kiro', 'sess_ce19…', 'prompt', NOW - HOUR), kind: 'nope' },
        ev('claude', 'e9a4…', 'prompt', NOW - 5 * 60_000, { text: 'run ls' }),
        ev('claude', 'e9a4…', 'stop', NOW - 4 * 60_000, { text: 'I ran ls.', cwd: '/Users/dev/demo/research' }),
        ev('codex', '01a1…', 'stop', NOW - 3 * 60_000, { firstInput: 'make hello.txt' }),
      ]) + '\n{"v":1,"agent":"kiro","session":"sess_cut',
    );

    const store = createStore({ dir });
    expect(await store.restore(NOW)).toBe(5);
    const views = store.views(NOW);
    expect(views.map((v) => v.name)).toEqual(['Claude Code @ demo', 'Codex @ demo']);
    const claude = views[0]!;
    // The session that waited for approval 20 h ago is OFFLINE now; the one that just finished comes first.
    expect(claude.sessions.map((s) => [s.session, s.state, s.title])).toEqual([
      ['e9a4…', 'TURN_DONE', 'run ls'],
      ['e697…', 'OFFLINE', 'delete hello.txt'],
    ]);
    expect(claude.state).toBe('TURN_DONE');
    expect(views[1]!.sessions[0]!.title).toBe('make hello.txt');
  });

  it('starts empty when the log files are missing', async () => {
    const store = createStore({ dir: join(dir, 'nothing-here') });
    expect(await store.restore(NOW)).toBe(0);
    expect(store.views(NOW)).toEqual([]);
  });

  it('works with only one of the two files', async () => {
    writeFileSync(join(dir, logFileName(YESTERDAY)), lines([ev('kiro', 'sess_ce19…', 'prompt', NOW - 2 * HOUR, { text: 'hello' })]));
    const store = createStore({ dir });
    expect(await store.restore(NOW)).toBe(1);
    expect(store.views(NOW)[0]).toMatchObject({ name: 'Kiro @ demo', state: 'OFFLINE' });
  });

  it('gives the same sessions and names as live arrival, and keeps the Kiro spec path', async () => {
    const spec = '/Users/dev/demo/.kiro/specs/a/tasks.md';
    const events = [
      ev('kiro', 'sess_0bcd…', 'task_start', NOW - 10 * 60_000, { task: { name: '2. Change the line', specPath: spec } }),
      ev('kiro', 'sess_ce19…', 'prompt', NOW - 9 * 60_000, { text: 'hello' }),
      ev('kiro', 'sess_0bcd…', 'task_done', NOW - 8 * 60_000, { task: { name: '2. Change the line', specPath: spec, success: true } }),
      ev('kiro', 'sess_ce19…', 'stop', NOW - 7 * 60_000),
    ];
    const live = createStore({ dir: join(dir, 'live') });
    for (const e of events) live.accept(e, Date.parse(e.at));
    writeFileSync(join(dir, logFileName(new Date(NOW))), lines([...events].reverse()));
    const restored = createStore({ dir });
    await restored.restore(NOW);
    expect(restored.views(NOW)).toEqual(live.views(NOW));
    expect(restored.buddies()[0]!.specPath).toBe(spec);
  });

  it('does not write the replayed events to the log again', async () => {
    const file = join(dir, logFileName(new Date(NOW)));
    const text = lines([ev('claude', 'e697…', 'prompt', NOW - 60_000, { text: 'hi' })]) + '\n';
    writeFileSync(file, text);
    const store = createStore({ dir });
    await store.restore(NOW);
    await store.flush();
    const { readFileSync } = await import('node:fs');
    expect(readFileSync(file, 'utf8')).toBe(text);
  });
});
