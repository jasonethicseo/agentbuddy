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
  const always = () => true;

  it('brings the app forward with its bundle ID', () => {
    expect(planJump(views(), C, always)).toEqual({ kind: 'run', bundleId: 'com.anthropic.claudefordesktop' });
  });

  it('adds the session folder only for Kiro, while the session is not offline or ended, and the folder exists', () => {
    expect(planJump(views('TURN_DONE'), K, always)).toEqual({ kind: 'run', bundleId: 'dev.kiro.desktop', folder: '/Users/dev/demo' });
    expect(planJump(views('WORKING'), K, () => false)).toEqual({ kind: 'run', bundleId: 'dev.kiro.desktop' });
    for (const s of ['OFFLINE', 'ENDED'] as const) expect(planJump(views(s), K, always)).toEqual({ kind: 'run', bundleId: 'dev.kiro.desktop' });
    const vscode = views('TURN_DONE', { [C]: 'com.microsoft.VSCode' });
    expect(planJump(vscode, C, always)).toEqual({ kind: 'run', bundleId: 'com.microsoft.VSCode' });
  });

  it('gives no folder to a Claude session running in a Kiro terminal (it reports the Kiro bundle ID)', () => {
    const inKiro = views('TURN_DONE', { [C]: 'dev.kiro.desktop' });
    inKiro[1]!.cwd = '/Users/dev/agentbuddy';
    expect(planJump(inKiro, C, always)).toEqual({ kind: 'run', bundleId: 'dev.kiro.desktop' });
  });

  it('asks isDirectory about the relay folder only, never another path', () => {
    const asked: string[] = [];
    planJump(views(), K, (p) => (asked.push(p), true));
    expect(asked).toEqual(['/Users/dev/demo']);
  });

  it('never uses a relative folder', () => {
    const list = views();
    list[0]!.cwd = 'demo';
    expect(planJump(list, K, () => true)).toEqual({ kind: 'run', bundleId: 'dev.kiro.desktop' });
  });

  it('shows a notice for a session that is gone, or that has no or a bad bundle ID', () => {
    expect(planJump(views(), key('codex', '01a1…'), () => true)).toEqual({ kind: 'notice', text: NOTICES.gone });
    expect(planJump(views('TURN_DONE', {}), C, () => true)).toEqual({ kind: 'notice', text: NOTICES.unknownApp });
    expect(planJump(views('TURN_DONE', { [C]: '-a Calculator' }), C, () => true)).toEqual({ kind: 'notice', text: NOTICES.unknownApp });
  });
});

describe('runJump', () => {
  const plan: JumpPlan = { kind: 'run', bundleId: 'dev.kiro.desktop', folder: '/Users/dev/demo' };

  it('checks that the app runs first, then opens it, each with a 3-second limit', async () => {
    const r = recorder([{ stdout: 'ASN:0x0-0x5bb1bac-"Kiro":\n' }, { stdout: '' }]);
    expect(await runJump(plan, r.exec, r.notice)).toBe('opened');
    expect(r.calls).toEqual([
      ['/usr/bin/lsappinfo', ['find', 'bundleid=dev.kiro.desktop'], 3000],
      ['/usr/bin/open', ['-b', 'dev.kiro.desktop', '/Users/dev/demo'], 3000],
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
