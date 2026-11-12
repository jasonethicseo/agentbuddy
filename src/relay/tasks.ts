// Reads a Kiro spec's tasks.md for progress. Unknown (null) on any doubt.

import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import type { Progress } from '../core/buddies';
import { RELAY_LIMITS } from '../core/config';
import { isAllowedSpecPath, parseProgress } from '../core/progress';

/**
 * Progress of `specPath`, read only if its real path is inside the real `cwd`,
 * has the form `.kiro/specs/<name>/tasks.md`, and is a regular file of at most 1 MB.
 */
export async function readProgress(specPath: string, cwd: string): Promise<Progress> {
  try {
    if (!isAbsolute(specPath) || !isAbsolute(cwd)) return null;
    const [realSpec, realCwd] = await Promise.all([realpath(specPath), realpath(cwd)]);
    if (!isAllowedSpecPath(realSpec, realCwd)) return null;
    const info = await stat(realSpec);
    if (!info.isFile() || info.size > RELAY_LIMITS.maxTasksFileBytes) return null;
    return parseProgress(await readFile(realSpec, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Starts progress reads per buddy and applies only the newest one, so a slow
 * old read can never overwrite the result of a newer one.
 */
export function createProgressReader(
  apply: (buddyKey: string, progress: Progress) => void,
  read: (specPath: string, cwd: string) => Promise<Progress> = readProgress,
) {
  const latest = new Map<string, number>();
  let counter = 0;
  return function refresh(buddyKey: string, specPath: string, cwd: string): Promise<void> {
    const id = ++counter;
    latest.set(buddyKey, id);
    return read(specPath, cwd).then((progress) => {
      if (latest.get(buddyKey) === id) apply(buddyKey, progress);
    });
  };
}
