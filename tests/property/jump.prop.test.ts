// P24: jump plans (messenger-app Requirements 12.3–12.7): a folder only for Kiro-agent sessions in Kiro.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { RANK } from '../../src/core/buddies';
import type { BuddyView } from '../../src/core/buddies';
import { isBundleId } from '../../src/core/launcher';
import type { DisplayState } from '../../src/core/state';
import { FOLDER_APP, jumpCommands, planJump } from '../../src/app/jump';
import { buddyView, key } from '../fixtures/views';

const AGENTS = ['kiro', 'claude', 'codex'] as const;
const bundleArb = fc.option(
  fc.oneof(
    fc.constantFrom(FOLDER_APP, 'com.microsoft.VSCode', 'com.apple.Terminal', 'com.anthropic.claudefordesktop'),
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
  it('run only valid bundle IDs, add a folder only under Requirement 12.7, and pass -b as the only option', () => {
    let withFolder = 0;
    fc.assert(
      fc.property(bundleArb, folderArb, fc.constantFrom(...(Object.keys(RANK) as DisplayState[])), fc.boolean(), fc.constantFrom(...AGENTS), (bundleId, folder, state, isDir, agent) => {
        const KEY = key(agent, 's1');
        const list: BuddyView[] = [buddyView(agent, folder || '/x', [{ key: KEY, state }])];
        list[0]!.cwd = folder;
        if (bundleId !== undefined) list[0]!.sessions[0]!.bundleId = bundleId;
        const plan = planJump(list, KEY, () => isDir);
        if (plan.kind === 'notice') {
          expect(isBundleId(bundleId)).toBe(false);
          return;
        }
        expect(isBundleId(plan.bundleId)).toBe(true);
        expect(plan.bundleId).toBe(bundleId);
        if (plan.folder !== undefined) {
          withFolder++;
          expect(plan.bundleId).toBe(FOLDER_APP);
          expect(agent).toBe('kiro');
          expect(['OFFLINE', 'ENDED']).not.toContain(state);
          expect(plan.folder.startsWith('/')).toBe(true);
          expect(plan.folder).not.toContain('\0');
          expect(isDir).toBe(true);
          expect(plan.folder).toBe(folder);
        }
        const { check, open } = jumpCommands(plan);
        for (const [file, args] of [check, open]) {
          expect(file.startsWith('/usr/bin/')).toBe(true);
          expect(args.filter((a) => a.startsWith('-'))).toEqual(file === '/usr/bin/open' ? ['-b'] : []);
        }
      }),
      { numRuns: 6000 },
    );
    expect(withFolder).toBeGreaterThan(10); // generator sanity: the folder branch is reached
  });
});
