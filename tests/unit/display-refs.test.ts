// Kiro context references shown in short form (messenger-app bug fix, 2026-11-13): names and excerpts on screen,
// in pop-ups and notifications; stored data keeps the raw text.
import { describe, expect, it } from 'vitest';
import { sessionLabel } from '../../src/app/ping-content';
import { sessionTitle } from '../../src/core/state';
import { displayRefs, statusParts } from '../../src/core/text';
import { sessionName } from '../../src/ui/model/list';
const SPEC = '#[[spec:feature:/Users/dev/demo/.kiro/specs/retro-skin]]';
describe('displayRefs', () => {
  it('shows a spec reference as its spec folder name and a file reference as its file name', () => {
    expect(displayRefs(`${SPEC} run task 3`)).toBe('spec: retro-skin run task 3');
    expect(displayRefs('#[[spec:feature:/Users/dev/demo/.kiro/specs/retro-skin/]] go')).toBe('spec: retro-skin go');
    expect(displayRefs('see #[[file:/Users/dev/demo/src/ui/main.ts]] please')).toBe('see file: main.ts please');
    expect(displayRefs('#[[file:src/ui/main.ts]]')).toBe('file: main.ts');
  });
  it('shortens any other reference to [ref], and a reference with no name too', () => {
    expect(displayRefs('#[[steering:/Users/dev/demo/.kiro/steering/tech.md]] ok')).toBe('[ref] ok');
    expect(displayRefs('#[[codebase]] and #[[spec:feature:]]')).toBe('[ref] and [ref]');
  });
  it('handles a reference cut short by a length limit', () => {
    expect(displayRefs('#[[spec:feature:/Users/dev/demo/.kir')).toBe('spec: …');
    expect(displayRefs('fix #[[file:/Users/dev/demo/src/ui/ma')).toBe('fix file: …');
    expect(displayRefs('#[[steering:/Users/dev/x]')).toBe('[ref]');
  });
  it('leaves text without references alone, and handles several references', () => {
    expect(displayRefs('hello · #[ not a ref ]')).toBe('hello · #[ not a ref ]');
    expect(displayRefs(`${SPEC} vs #[[file:/Users/dev/a/b.md]]`)).toBe('spec: retro-skin vs file: b.md');
  });
});
describe('where the short form is used', () => {
  it('excerpts are made from the short form, then cut to 40 code points', () => {
    const parts = statusParts('WORKING', false, `${SPEC} implement the toolbar keys`, false);
    expect(parts.excerpt).toBe('spec: retro-skin implement the toolbar…');
  });
  it('session names on screen, in pop-ups and in notifications use it', () => {
    const clock = { nowMs: 0, time: () => '00:00' };
    expect(sessionName({ title: `${SPEC.slice(0, 40)}`, startedAt: '2026-11-13T00:00:00.000Z' }, false, clock)).toBe('spec: …');
    expect(sessionName({ title: 'see #[[file:/Users/dev/a/b.md]]', startedAt: '2026-11-13T00:00:00.000Z' }, false, clock)).toBe('see file: b.md');
    expect(sessionLabel({ hideText: false, formatTime: () => '00:00' }, 'see #[[file:/Users/dev/a/b.md]]', '2026-11-13T00:00:00.000Z')).toBe('see file: b.md');
  });
  it('the stored session title keeps the raw text', () => {
    const event = { v: 1 as const, agent: 'kiro' as const, session: 'sess_1…', kind: 'prompt' as const, at: '2026-11-13T00:00:00.000Z', cwd: '/Users/dev/demo', text: `${SPEC} go` };
    const title = sessionTitle({ first: { event, seq: 0 }, prompt: { event, seq: 0 } } as Parameters<typeof sessionTitle>[0]);
    expect(title!.startsWith('#[[spec:feature:/Users/dev/demo')).toBe(true);
  });
});
