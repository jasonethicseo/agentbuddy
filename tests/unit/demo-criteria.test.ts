// product.md's demo criteria, checked on the replay the page runs (submission Requirements 3.1, 3.5):
// within 60 s of Start demo, three buddies change state, Kiro progress moves, Claude asks for an OK
// with a ding and a pop-up, works again after it (MA BF5), and finishes; Codex finishes a turn.
import { describe, expect, it } from 'vitest';
import type { BuddyView } from '../../src/core/buddies';
import { evenSteps, runDemo } from './demo-helpers';

const WITHIN = 60_000;
const run = runDemo(evenSteps(250, WITHIN));
const buddy = (views: BuddyView[], agent: string) => views.find((b) => b.agent === agent);
const states = (agent: string) => run.lists.map((l) => buddy(l.views, agent)?.state ?? 'none');
const changes = (xs: string[]) => xs.filter((x, i) => i > 0 && x !== xs[i - 1]).length;

describe('demo criteria (product.md)', () => {
  it('three buddies, Kiro, Claude Code and Codex, each change state', () => {
    for (const agent of ['kiro', 'claude', 'codex']) expect(changes(states(agent)), agent).toBeGreaterThanOrEqual(1);
    expect(new Set(run.lists.at(-1)!.views.map((b) => b.agent))).toEqual(new Set(['kiro', 'claude', 'codex']));
  });

  it('the Kiro progress bar moves at least twice', () => {
    const done = run.lists.map((l) => buddy(l.views, 'kiro')?.progress?.done ?? null).filter((d): d is number => d !== null);
    expect(changes(done.map(String))).toBeGreaterThanOrEqual(2);
    expect(done.every((d, i) => i === 0 || d >= done[i - 1]!)).toBe(true);
  });

  it('Claude asks for an OK with a ding and a pop-up, works again after it, then finishes with a second ping', () => {
    const claude = run.pings.filter((p) => p.session?.includes('claude'));
    expect(claude.map((p) => p.state)).toEqual(['WAITING_APPROVAL', 'TURN_DONE']);
    const ok = claude[0]!;
    expect(run.dings).toContain(ok.ms);
    const after = run.lists.filter((l) => l.ms > ok.ms && l.ms < claude[1]!.ms).map((l) => buddy(l.views, 'claude')?.state);
    expect(after).toContain('WORKING');
    expect(claude[1]!.ms).toBeLessThanOrEqual(WITHIN);
  });

  it('Codex finishes a turn with a ping', () => {
    expect(run.pings.some((p) => p.session?.includes('codex') && p.state === 'TURN_DONE')).toBe(true);
  });

  it('the events before the start make the baseline and never ping', () => {
    expect(run.pings.every((p) => p.ms > 0)).toBe(true);
    expect(buddy(run.lists[0]!.views, 'codex')?.state).toBe('IDLE');
  });
});
