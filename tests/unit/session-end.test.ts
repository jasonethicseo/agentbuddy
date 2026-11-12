// Claude SessionEnd: logged off (ENDED), shared lowest rank with OFFLINE
// (Requirements 9.12; messenger-app Requirements 2.1–2.4).
import { describe, expect, it } from 'vitest';
import { pruneList, toBuddyView } from '../../src/core/buddies';
import type { EventKind } from '../../src/core/event';
import { normalize } from '../../src/core/normalize';
import { FIXTURES } from '../fixtures/payloads';
import { T0, MIN, HOUR, at, ev, run, buddy, view } from './state-helpers';

describe('session end', () => {
  it('turns the observed Claude SessionEnd into end, and the session logged off (ENDED) at once', () => {
    const fixture = FIXTURES.find((f) => f.id === 'claude-app-session-end')!;
    const end = normalize('claude', fixture.raw, at(5))!;
    expect(end).toMatchObject({ agent: 'claude', kind: 'end', session: 'aba1…' });
    const prompt = ev('prompt', 0, { agent: 'claude', session: 'aba1…', text: 'hello' });
    const v = view(run([prompt, end]), T0 + 5 * MIN, 'claude');
    expect([v.state, v.sessions[0]!.state, v.statusText]).toEqual(['ENDED', 'ENDED', 'hello']);
    // Still ENDED long after, until the 24-hour removal.
    expect(view(run([prompt, end]), T0 + 20 * HOUR, 'claude').state).toBe('ENDED');
  });

  it('keeps the buddy as urgent as its other sessions', () => {
    const c = (session: string, kind: EventKind, m: number) => ev(kind, m, { agent: 'claude', session });
    const v = view(run([c('aba1…', 'prompt', 0), c('aba1…', 'end', 1), c('81fd…', 'permission', 2)]), T0 + 3 * MIN, 'claude');
    expect(v.state).toBe('WAITING_APPROVAL');
    expect(v.sessions.map((s) => s.state)).toEqual(['WAITING_APPROVAL', 'ENDED']);
  });

  it('ranks OFFLINE and ENDED the same, so the later of the two sets the buddy state', () => {
    const c = (session: string, kind: EventKind, m: number) => ev(kind, m, { agent: 'claude', session });
    const now = T0 + 3 * HOUR; // the quiet session is OFFLINE by the 30-minute rule
    const endedLater = view(run([c('81fd…', 'prompt', 0), c('aba1…', 'prompt', 10), c('aba1…', 'end', 20)]), now, 'claude');
    expect([endedLater.state, endedLater.sessions.map((s) => s.state)]).toEqual(['ENDED', ['ENDED', 'OFFLINE']]);
    const quietLater = view(run([c('aba1…', 'prompt', 0), c('aba1…', 'end', 1), c('81fd…', 'prompt', 20)]), now, 'claude');
    expect([quietLater.state, quietLater.sessions.map((s) => s.state)]).toEqual(['OFFLINE', ['OFFLINE', 'ENDED']]);
  });

  it('removing a 24-hour-old OFFLINE session leaves an ENDED buddy unchanged', () => {
    const c = (session: string, kind: EventKind, m: number) => ev(kind, m, { agent: 'claude', session });
    const list = run([c('81fd…', 'prompt', 0), c('aba1…', 'prompt', 26 * 60), c('aba1…', 'end', 26 * 60 + 1)]);
    const now = T0 + 26 * HOUR + 30 * MIN;
    const before = view(list, now, 'claude');
    const after = toBuddyView(buddy(pruneList(list, now), 'claude'), null, now);
    expect(before.state).toBe('ENDED');
    expect(after.state).toBe('ENDED');
    expect(after.sessions).toHaveLength(1);
  });
});
