// Jump: bring forward the app a session runs in (messenger-app Requirement 12).
// `planJump` is pure; `runJump` runs fixed programs through an injected `execFile`,
// never a shell. Plain module: no Electron.
import type { BuddyView, SessionView } from '../core/buddies';
import { KEY_MAX } from '../core/config';
import { isBundleId } from '../core/launcher';
import { JUMP_TIMEOUT_MS } from './config';

/** The only app that gets a folder argument (decision Q1 (b), O3). */
export const FOLDER_APP = 'dev.kiro.desktop';

export type JumpPlan = { kind: 'notice'; text: string } | { kind: 'run'; bundleId: string; folder?: string };

export const NOTICES = {
  gone: 'this session is gone',
  unknownApp: "can't tell which app this session is in",
  notRunning: (id: string) => `${id} is not running`,
  failed: (id: string) => `couldn't bring ${id} forward`,
} as const;

function find(views: readonly BuddyView[], session: string): { buddy: BuddyView; s: SessionView } | null {
  for (const buddy of views) for (const s of buddy.sessions) if (s.key === session) return { buddy, s };
  return null;
}

/**
 * What a jump to `session` should do. Everything comes from the main process's own
 * copy of the relay's list; a window only sends the key (Requirement 12.2).
 * A folder is added only for sessions of the Kiro agent that run in Kiro (`dev.kiro.desktop`),
 * are not offline or ended, and whose folder is an absolute path to an existing directory
 * right now (12.7). A Claude or Codex session in a Kiro terminal also reports Kiro's bundle ID,
 * but its folder need not be a Kiro window's workspace, so it gets no folder (2026-11-13).
 */
export function planJump(views: readonly BuddyView[], session: string, isDirectory: (path: string) => boolean): JumpPlan {
  const found = find(views, session);
  if (found === null) return { kind: 'notice', text: NOTICES.gone };
  const { buddy, s } = found;
  if (!isBundleId(s.bundleId)) return { kind: 'notice', text: NOTICES.unknownApp };
  const folder = buddy.cwd;
  const withFolder =
    buddy.agent === 'kiro' &&
    s.bundleId === FOLDER_APP &&
    s.state !== 'OFFLINE' &&
    s.state !== 'ENDED' &&
    folder.startsWith('/') &&
    folder.length <= KEY_MAX &&
    !folder.includes('\0') &&
    isDirectory(folder);
  return withFolder ? { kind: 'run', bundleId: s.bundleId, folder } : { kind: 'run', bundleId: s.bundleId };
}

/** The two commands of a `run` plan: the running check, then `open`. Program paths are absolute. */
export function jumpCommands(plan: { bundleId: string; folder?: string }): { check: [string, string[]]; open: [string, string[]] } {
  return {
    check: ['/usr/bin/lsappinfo', ['find', `bundleid=${plan.bundleId}`]],
    open: ['/usr/bin/open', plan.folder === undefined ? ['-b', plan.bundleId] : ['-b', plan.bundleId, plan.folder]],
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
