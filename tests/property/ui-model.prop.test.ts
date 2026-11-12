// P26: the buddy list model (messenger-app Requirements 6.1–6.6).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { RANK } from '../../src/core/buddies';
import type { BuddyView } from '../../src/core/buddies';
import type { AgentId } from '../../src/core/event';
import type { DisplayState } from '../../src/core/state';
import { buildGroups } from '../../src/ui/model/list';
import { T0, buddyView, key, snapshot } from '../fixtures/views';

const STATES = Object.keys(RANK) as DisplayState[];
const CWDS = ['/Users/dev/a/demo', '/Users/dev/b/demo', '/Users/dev/app'];
const AGENTS: AgentId[] = ['kiro', 'claude', 'codex'];
const clock = { nowMs: T0 + 3_600_000, time: () => '00:00' };
/** Sessions whose index mod 5 is picked are hidden with ×. */
const KEYS_OF = [0, 1, 2, 3, 4];

const listArb: fc.Arbitrary<BuddyView[]> = fc
  .uniqueArray(fc.record({ agent: fc.constantFrom(...AGENTS), cwd: fc.constantFrom(...CWDS) }), { selector: (b) => `${b.agent}|${b.cwd}`, maxLength: 9 })
  .chain((buddies) =>
    fc.tuple(...buddies.map((b, i) => fc.array(fc.constantFrom(...STATES), { minLength: 1, maxLength: 4 }).map((states) => buddyView(b.agent, b.cwd, states.map((state, j) => ({ key: key(b.agent, `s${i}-${j}`), state })))))),
  );

describe('P26 buddy list model', () => {
  it('puts every buddy in one group, offline exactly when all sessions are OFFLINE or ENDED, with rows only for two or more visible', () => {
    fc.assert(
      fc.property(listArb, fc.subarray(KEYS_OF), fc.boolean(), (buddies, hiddenPick, showAll) => {
        const allKeys = buddies.flatMap((b) => b.sessions.map((s) => s.key));
        const hidden = allKeys.filter((_, i) => hiddenPick.includes(i % 5));
        const showMore = new Set(showAll ? buddies.map((b) => b.key) : []);
        const groups = buildGroups(snapshot(buddies, { hidden }), showMore, clock);
        const placed = groups.flatMap((g) => g.buddies.map((b) => [b.key, g.kind] as const));
        expect(placed.map(([k]) => k).sort()).toEqual(buddies.map((b) => b.key).sort());
        for (const b of buddies) {
          const offline = b.sessions.every((s) => s.state === 'OFFLINE' || s.state === 'ENDED');
          expect(placed.find(([k]) => k === b.key)![1]).toBe(offline ? 'offline' : 'folder');
        }
        for (const g of groups) {
          expect(g.online).toBeLessThanOrEqual(g.total);
          if (g.kind === 'folder') expect(g.online).toBe(g.buddies.length);
          for (const vm of g.buddies) {
            const b = buddies.find((x) => x.key === vm.key)!;
            const quiet = (s: (typeof b.sessions)[number]) => ['IDLE', 'OFFLINE', 'ENDED'].includes(s.state) || hidden.includes(s.key);
            const visible = showMore.has(b.key) ? b.sessions : b.sessions.filter((s) => !quiet(s));
            expect(vm.sessions.length).toBe(visible.length >= 2 ? visible.length : 0);
            expect(vm.count).toBe(visible.length >= 2 ? visible.length : undefined);
            expect(vm.hide).toBe(visible.length === 1 ? visible[0]!.key : undefined);
            expect(vm.more !== undefined).toBe(b.sessions.some(quiet));
            expect(vm.state).toBe(b.state);
          }
        }
      }),
      { numRuns: 500 },
    );
  });
});

