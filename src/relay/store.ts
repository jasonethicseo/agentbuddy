// In-memory buddy list plus the daily event log.

import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { BuddyEvent } from '../core/event';
import { applyEvent, toViews } from '../core/state';
import type { BuddyList, BuddyRecord, BuddyView, Progress } from '../core/state';
import { logFileName } from './home';

export interface Store {
  /** Applies an accepted event and appends it to today's log. Returns the buddy key. */
  accept(event: BuddyEvent, nowMs: number): string;
  record(key: string): BuddyRecord | undefined;
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
  let list: BuddyList = new Map();
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

  return {
    accept(event, nowMs) {
      const result = applyEvent(list, event, ++seq);
      list = result.list;
      append(event, nowMs);
      return result.key;
    },
    record: (key) => list.get(key),
    setProgress(key, next) {
      const prev = progress.get(key) ?? null;
      progress.set(key, next);
      return JSON.stringify(prev) !== JSON.stringify(next);
    },
    views: (nowMs) => toViews(list, progress, nowMs),
    flush: () => writing,
  };
}
