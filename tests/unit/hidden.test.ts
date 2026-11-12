// Sessions hidden with × (messenger-app Requirements 13.1, 13.5).
import { describe, expect, it } from 'vitest';
import { hide, isHidden, refreshHidden } from '../../src/core/attention';
import { T0, buddyView, key, sessionView } from '../fixtures/views';

const A = key('claude', 'e697…');
const HOUR = 3_600_000;

describe('hidden sessions', () => {
  const s = (last: number) => sessionView({ key: A, state: 'TURN_DONE', last });
  const list = (last: number) => [buddyView('claude', '/Users/dev/demo', [{ key: A, state: 'TURN_DONE', last }])];

  it('stay hidden until the session has a later event, then show again', () => {
    const hidden = hide(new Map(), s(60), T0 + 61_000);
    expect(isHidden(hidden, s(60))).toBe(true);
    expect(refreshHidden(hidden, list(60), T0 + 120_000)).toBe(hidden);
    expect(isHidden(hidden, s(61))).toBe(false);
    expect(refreshHidden(hidden, list(61), T0 + 120_000).size).toBe(0);
  });

  it('drop a mark after 24 hours, but keep it while its session is missing from the list', () => {
    const hidden = hide(new Map(), s(60), T0);
    expect(refreshHidden(hidden, [], T0 + 23 * HOUR).has(A)).toBe(true);
    expect(refreshHidden(hidden, [], T0 + 24 * HOUR + 1).has(A)).toBe(false);
  });
});
