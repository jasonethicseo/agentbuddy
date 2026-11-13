// Jump planning and running with a recording exec (messenger-app Requirements 12.1–12.11, 17.1).
// Nothing here runs a real program.
import { describe, expect, it } from 'vitest';
import type { BuddyView } from '../../src/core/buddies';
import type { DisplayState } from '../../src/core/state';
import { NOTICES, jumpCommands, planJump, runJump } from '../../src/app/jump';
import type { Exec, JumpPlan } from '../../src/app/jump';
import { buddyView, key } from '../fixtures/views';

const K = key('kiro', 'sess_ce19…');
const C = key('claude', 'e697…');

function views(state: DisplayState = 'TURN_DONE', bundle: Record<string, string | undefined> = { [K]: 'dev.kiro.desktop', [C]: 'com.anthropic.claudefordesktop' }): BuddyView[] {
  const list = [buddyView('kiro', '/Users/dev/demo', [{ key: K, state }]), buddyView('claude', '/Users/dev/demo', [{ key: C, state }])];
  for (const b of list) for (const s of b.sessions) if (bundle[s.key] !== undefined) s.bundleId = bundle[s.key]!;
  return list;
}

function recorder(answers: Array<{ stdout: string } | Error>) {
  const calls: Array<[string, readonly string[], number]> = [];
  const exec: Exec = async (file, args, opts) => {
    calls.push([file, args, opts.timeout]);
    const a = answers.shift() ?? { stdout: '' };
    if (a instanceof Error) throw a;
    return a;
  };
  const notices: string[] = [];
  return { exec, calls, notices, notice: (t: string) => notices.push(t) };
}

describe('planJump', () => {
  it('brings the app forward with its bundle ID', () => {
    expect(planJump(views(), C)).toEqual({ kind: 'run', bundleId: 'com.anthropic.claudefordesktop' });
  });
  it('never passes a folder, Kiro included: a folder argument opened a new Kiro window (fix F1)', () => {
    for (const s of ['WAITING_APPROVAL', 'WORKING', 'TURN_DONE', 'IDLE', 'STALE', 'OFFLINE', 'ENDED'] as const) {
      expect(planJump(views(s), K)).toEqual({ kind: 'run', bundleId: 'dev.kiro.desktop' });
    }
    expect(planJump(views('TURN_DONE', { [C]: 'com.microsoft.VSCode' }), C)).toEqual({ kind: 'run', bundleId: 'com.microsoft.VSCode' });
    expect(planJump(views('TURN_DONE', { [C]: 'dev.kiro.desktop' }), C)).toEqual({ kind: 'run', bundleId: 'dev.kiro.desktop' });
  });
  it('brings the Codex app forward for a Codex session that reports no app (fix F3, observed 2026-11-13)', () => {
    const X = key('codex', '01a1…');
    const list = [...views(), buddyView('codex', '/Users/dev/demo', [{ key: X, state: 'TURN_DONE' }])];
    expect(planJump(list, X)).toEqual({ kind: 'run', bundleId: 'com.openai.codex' });
    list[2]!.sessions[0]!.bundleId = '-a Calculator';
    expect(planJump(list, X)).toEqual({ kind: 'run', bundleId: 'com.openai.codex' });
    list[2]!.sessions[0]!.bundleId = 'com.apple.Terminal';
    expect(planJump(list, X)).toEqual({ kind: 'run', bundleId: 'com.apple.Terminal' }); // a reported app wins
  });
  it('shows a notice for a session that is gone, or that has no or a bad bundle ID', () => {
    expect(planJump(views(), key('codex', '01a1…'))).toEqual({ kind: 'notice', text: NOTICES.gone });
    expect(planJump(views('TURN_DONE', {}), C)).toEqual({ kind: 'notice', text: NOTICES.unknownApp });
    expect(planJump(views('TURN_DONE', { [C]: '-a Calculator' }), C)).toEqual({ kind: 'notice', text: NOTICES.unknownApp });
  });
});
describe('runJump', () => {
  const plan: JumpPlan = { kind: 'run', bundleId: 'dev.kiro.desktop' };

  it('checks that the app runs first, then opens it, each with a 3-second limit', async () => {
    const r = recorder([{ stdout: 'ASN:0x0-0x5bb1bac-"Kiro":\n' }, { stdout: '' }]);
    expect(await runJump(plan, r.exec, r.notice)).toBe('opened');
    expect(r.calls).toEqual([
      ['/usr/bin/lsappinfo', ['find', 'bundleid=dev.kiro.desktop'], 3000],
      ['/usr/bin/open', ['-b', 'dev.kiro.desktop'], 3000],
    ]);
    expect(r.notices).toEqual([]);
  });

  it('never starts an app that is not running', async () => {
    const r = recorder([{ stdout: '\n' }]);
    expect(await runJump({ kind: 'run', bundleId: 'com.googlecode.iterm2' }, r.exec, r.notice)).toBe('not-running');
    expect(r.calls.map((c) => c[0])).toEqual(['/usr/bin/lsappinfo']);
    expect(r.notices).toEqual(['com.googlecode.iterm2 is not running']);
  });

  it('shows a notice when open fails (unknown ID) or a command times out', async () => {
    const unknown = recorder([{ stdout: 'ASN:x' }, Object.assign(new Error('exit 1'), { code: 1 })]);
    expect(await runJump({ kind: 'run', bundleId: 'com.example.gone' }, unknown.exec, unknown.notice)).toBe('failed');
    expect(unknown.notices).toEqual(["couldn't bring com.example.gone forward"]);
    const slow = recorder([Object.assign(new Error('timeout'), { killed: true, signal: 'SIGTERM' })]);
    expect(await runJump({ kind: 'run', bundleId: 'com.apple.Terminal' }, slow.exec, slow.notice)).toBe('failed');
  });

  it('passes a notice plan on, and refuses a malformed bundle ID even in a run plan', async () => {
    const r = recorder([]);
    expect(await runJump({ kind: 'notice', text: NOTICES.gone }, r.exec, r.notice)).toBe('notice');
    expect(await runJump({ kind: 'run', bundleId: 'x; open -a Calculator' }, r.exec, r.notice)).toBe('notice');
    expect(r.calls).toEqual([]);
    expect(r.notices).toEqual([NOTICES.gone, NOTICES.unknownApp]);
  });

  it('builds argument arrays, never command text', () => {
    expect(jumpCommands({ bundleId: 'com.apple.Terminal' })).toEqual({
      check: ['/usr/bin/lsappinfo', ['find', 'bundleid=com.apple.Terminal']],
      open: ['/usr/bin/open', ['-b', 'com.apple.Terminal']],
    });
  });
});
