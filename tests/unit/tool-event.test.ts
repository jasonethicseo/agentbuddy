// Claude `PostToolUse` as kind `tool` (events.md "Observed on 2026-11-16: work after an approval"):
// an approval followed by a tool run shows WORKING again, a late tool event never undoes a stop or an end,
// and a turn of many tool events keeps its prompt's text.
import { describe, expect, it } from 'vitest';
import type { EventKind } from '../../src/core/event';
import { WINDOW_SIZE } from '../../src/core/config';
import { T0, MIN, ev, run, view } from './state-helpers';

const c = (kind: EventKind, minute: number, text?: string) =>
  ev(kind, minute, { agent: 'claude', session: 'e697…', ...(text === undefined ? {} : { text }) });
const claudeView = (events: ReturnType<typeof c>[], nowMinute: number) => view(run(events), T0 + nowMinute * MIN, 'claude');

describe('tool events', () => {
  it('leave WAITING_APPROVAL for WORKING once the approved tool has run', () => {
    expect(claudeView([c('prompt', 0, 'delete hello.txt'), c('permission', 1)], 2).state).toBe('WAITING_APPROVAL');
    const v = claudeView([c('prompt', 0, 'delete hello.txt'), c('permission', 1), c('tool', 2)], 3);
    expect([v.state, v.statusText]).toEqual(['WORKING', 'delete hello.txt']);
  });

  it('keep a long-running turn WORKING instead of ? (no news)', () => {
    const tools = Array.from({ length: 15 }, (_, i) => c('tool', i + 1));
    expect(claudeView([c('prompt', 0, 'build it'), ...tools], 20).state).toBe('WORKING');
    expect(claudeView([c('prompt', 0, 'build it')], 20).state).toBe('STALE');
  });

  it('never undo a stop or an end, in any arrival order', () => {
    const turn = [c('prompt', 0, 'go'), c('permission', 1), c('stop', 3)];
    expect(claudeView([...turn, c('tool', 2)], 4).state).toBe('TURN_DONE');
    expect(claudeView([c('tool', 2), ...turn], 4).state).toBe('TURN_DONE');
    expect(claudeView([c('prompt', 0, 'go'), c('end', 3), c('tool', 4)], 5).state).toBe('ENDED');
  });

  it('keep the prompt text after more tool events than the window holds', () => {
    const tools = Array.from({ length: WINDOW_SIZE + 10 }, (_, i) => ev('tool', 1 + i / 100, { agent: 'claude', session: 'e697…' }));
    const v = claudeView([c('prompt', 0, 'refactor the relay'), ...tools], 2);
    expect([v.state, v.statusText]).toEqual(['WORKING', 'refactor the relay']);
    const done = claudeView([c('prompt', 0, 'refactor the relay'), ...tools, c('stop', 2)], 3);
    expect([done.state, done.statusText]).toEqual(['TURN_DONE', 'refactor the relay']);
  });

  it('a new approval after a tool run is a new WAITING_APPROVAL', () => {
    const v = claudeView([c('prompt', 0, 'go'), c('permission', 1), c('tool', 2), c('permission', 3)], 4);
    expect(v.state).toBe('WAITING_APPROVAL');
  });
});
