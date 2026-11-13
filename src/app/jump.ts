// Jump: bring forward the app a session runs in (messenger-app Requirement 12).
// `planJump` is pure; `runJump` runs fixed programs through an injected `execFile`,
// never a shell. Plain module: no Electron.
import type { BuddyView, SessionView } from '../core/buddies';
import { isBundleId } from '../core/launcher';
import { JUMP_TIMEOUT_MS } from './config';

/** A jump only brings an app forward; no app gets a folder argument (fix F1, 2026-11-13). */
export type JumpPlan = { kind: 'notice'; text: string } | { kind: 'run'; bundleId: string };

export const NOTICES = {
  gone: 'this session is gone',
  unknownApp: "can't tell which app this session is in",
  notRunning: (id: string) => `${id} is not running`,
  failed: (id: string) => `couldn't bring ${id} forward`,
} as const;

function find(views: readonly BuddyView[], session: string): SessionView | null {
  for (const buddy of views) for (const s of buddy.sessions) if (s.key === session) return s;
  return null;
}

/**
 * What a jump to `session` should do. Everything comes from the main process's own
 * copy of the relay's list; a window only sends the key (Requirement 12.2).
 * No folder is ever passed (fix F1, 2026-11-13): `open -b dev.kiro.desktop <folder>` opens a new Kiro window
 * whenever no Kiro window has that folder as its only folder, for example a window with a multi-root workspace.
 */
export function planJump(views: readonly BuddyView[], session: string): JumpPlan {
  const s = find(views, session);
  if (s === null) return { kind: 'notice', text: NOTICES.gone };
  if (!isBundleId(s.bundleId)) return { kind: 'notice', text: NOTICES.unknownApp };
  return { kind: 'run', bundleId: s.bundleId };
}

/** The two commands of a `run` plan: the running check, then `open -b`. Program paths are absolute. */
export function jumpCommands(plan: { bundleId: string }): { check: [string, string[]]; open: [string, string[]] } {
  return {
    check: ['/usr/bin/lsappinfo', ['find', `bundleid=${plan.bundleId}`]],
    open: ['/usr/bin/open', ['-b', plan.bundleId]],
  };
}

/** `execFile` without a shell, promisified: resolves with stdout, rejects on a non-zero exit or the timeout. */
export type Exec = (file: string, args: readonly string[], opts: { timeout: number }) => Promise<{ stdout: string }>;

export type JumpResult = 'notice' | 'not-running' | 'opened' | 'failed';

/**
 * Runs a plan. The app is never started: when `lsappinfo` finds no running app with
 * that bundle ID (it prints nothing, O2), a notice is shown and `open` is not run.
 * Any failure shows a notice; nothing throws.
 */
export async function runJump(plan: JumpPlan, exec: Exec, notice: (text: string) => void): Promise<JumpResult> {
  if (plan.kind === 'notice') {
    notice(plan.text);
    return 'notice';
  }
  if (!isBundleId(plan.bundleId)) {
    notice(NOTICES.unknownApp);
    return 'notice';
  }
  const { check, open } = jumpCommands(plan);
  try {
    const { stdout } = await exec(check[0], check[1], { timeout: JUMP_TIMEOUT_MS });
    if (stdout.trim() === '') {
      notice(NOTICES.notRunning(plan.bundleId));
      return 'not-running';
    }
    await exec(open[0], open[1], { timeout: JUMP_TIMEOUT_MS });
    return 'opened';
  } catch {
    notice(NOTICES.failed(plan.bundleId));
    return 'failed';
  }
}
