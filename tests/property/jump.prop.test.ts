// P24: jump plans (messenger-app Requirements 12.3–12.6; fixes F1, F3): only valid bundle IDs, `-b` as the only option,
// never a folder, and the Codex app for a Codex session that reports no app.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { RANK } from '../../src/core/buddies';
import type { BuddyView } from '../../src/core/buddies';
import { isBundleId } from '../../src/core/launcher';
import type { DisplayState } from '../../src/core/state';
import { CODEX_APP, jumpCommands, planJump } from '../../src/app/jump';
import { buddyView, key } from '../fixtures/views';
const AGENTS = ['kiro', 'claude', 'codex'] as const;
const bundleArb = fc.option(
  fc.oneof(
    fc.constantFrom('dev.kiro.desktop', 'com.microsoft.VSCode', 'com.apple.Terminal', 'com.anthropic.claudefordesktop'),
    fc.constantFrom('-a', '-b.x', 'com.x;id', 'com. x', 'kiro', '', '$(id).app', 'com.x\nopen'),
    fc.string({ maxLength: 40 }),
  ),
  { nil: undefined },
);
const folderArb = fc.oneof(
  fc.constantFrom('/Users/dev/demo', '/', 'demo', '-rf', '--args', '/Users/dev/de\0mo', '~/demo', ''),
  fc.string({ maxLength: 30 }),
  fc.string({ maxLength: 30 }).map((s) => `/${s}`),
);
describe('P24 jump plans', () => {
  it('run only valid bundle IDs, never pass a folder, and pass -b as the only option', () => {
    fc.assert(
      fc.property(bundleArb, folderArb, fc.constantFrom(...(Object.keys(RANK) as DisplayState[])), fc.constantFrom(...AGENTS), (bundleId, folder, state, agent) => {
        const KEY = key(agent, 's1');
        const list: BuddyView[] = [buddyView(agent, folder || '/x', [{ key: KEY, state }])];
        list[0]!.cwd = folder;
        if (bundleId !== undefined) list[0]!.sessions[0]!.bundleId = bundleId;
        const plan = planJump(list, KEY);
        // A Codex session that reports no valid app falls back to the Codex app (fix F3); every other one gets a notice.
        const expectedId = isBundleId(bundleId) ? bundleId : agent === 'codex' ? CODEX_APP : undefined;
        if (plan.kind === 'notice') {
          expect(expectedId).toBeUndefined();
          return;
        }
        expect(plan).toEqual({ kind: 'run', bundleId: expectedId });
        expect(isBundleId(plan.bundleId)).toBe(true);
        const { check, open } = jumpCommands(plan);
        expect(open).toEqual(['/usr/bin/open', ['-b', expectedId]]);
        for (const [file, args] of [check, open]) {
          expect(file.startsWith('/usr/bin/')).toBe(true);
          expect(args.filter((a) => a.startsWith('-'))).toEqual(file === '/usr/bin/open' ? ['-b'] : []);
        }
      }),
      { numRuns: 6000 },
    );
  });
});
