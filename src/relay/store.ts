// In-memory buddy list plus the daily event log.

import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { applyEvent, groupBuddies, pruneList, toViews } from '../core/buddies';
import type { BuddyRecord, BuddyView, Progress, SessionList } from '../core/buddies';
import type { BuddyEvent } from '../core/event';
import { logFileName } from './home';

export interface Store {
  /** Applies an accepted event, removes old sessions, and appends the event to today's log. */
  accept(event: BuddyEvent, nowMs: number): { buddy: string; session: string };
  buddy(key: string): BuddyRecord | undefined;
  /** Removes sessions older than 24 hours; true if anything changed. */
  prune(nowMs: number): boolean;
  /** Sets a buddy's progress; true if it changed. */
  setProgress(key: string, progress: Progress): boolean;
  views(nowMs: number): BuddyView[];
  /** Resolves when every queued log write has finished. */
  flush(): Promise<void>;
}

export interface StoreOptions {
  dir: string;
  /** Called with an errno code when a log append fails. Never gets event text. */
  onLogError?: (code: string) => void;
}

export function createStore(opts: StoreOptions): Store {
  let list: SessionList = new Map();
  const progress = new Map<string, Progress>();
  let seq = 0;
  let writing: Promise<void> = Promise.resolve();

  function append(event: BuddyEvent, nowMs: number): void {
    const file = join(opts.dir, logFileName(new Date(nowMs)));
    const line = `${JSON.stringify(event)}\n`;
    // One chain keeps lines in acceptance order. `mode` applies when the file is created.
    writing = writing
      .then(() => appendFile(file, line, { mode: 0o600 }))
      .catch((err: NodeJS.ErrnoException) => opts.onLogError?.(err.code ?? 'unknown'));
  }

  function prune(nowMs: number): boolean {
    const next = pruneList(list, nowMs);
    if (next === list) return false;
    list = next;
    const buddies = groupBuddies(list);
    for (const key of progress.keys()) if (!buddies.has(key)) progress.delete(key);
    return true;
  }

  return {
    accept(event, nowMs) {
      const result = applyEvent(list, event, ++seq);
      list = result.list;
      prune(nowMs);
      append(event, nowMs);
      return { buddy: result.buddy, session: result.session };
    },
    buddy: (key) => groupBuddies(list).get(key),
    prune,
    setProgress(key, next) {
      const prev = progress.get(key) ?? null;
      progress.set(key, next);
      return JSON.stringify(prev) !== JSON.stringify(next);
    },
    views: (nowMs) => toViews(list, progress, nowMs),
    flush: () => writing,
  };
}
