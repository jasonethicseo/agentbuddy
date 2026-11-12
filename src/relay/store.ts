// In-memory session list plus the daily event log, and restore from it on start.

import { appendFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { applyEvent, groupBuddies, pruneList, toViews } from '../core/buddies';
import type { BuddyRecord, BuddyView, Progress, SessionList } from '../core/buddies';
import { SESSION_TTL_MS } from '../core/config';
import { validateEvent } from '../core/event';
import type { BuddyEvent } from '../core/event';
import { logFileName } from './home';

export interface Store {
  /** Applies an accepted event, removes old sessions, and appends the event to today's log. */
  accept(event: BuddyEvent, nowMs: number): { buddy: string; session: string };
  /** Replays yesterday's and today's logs (last 24 hours only). Returns the number of events replayed. */
  restore(nowMs: number): Promise<number>;
  buddy(key: string): BuddyRecord | undefined;
  buddies(): BuddyRecord[];
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

/** Local noon of the previous day, so a DST change can never land on the same date. */
function yesterday(nowMs: number): Date {
  const d = new Date(nowMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 12);
}

/** Valid events from one log text, in file order. Bad and cut-off lines are skipped. */
function parseLog(text: string): BuddyEvent[] {
  const events: BuddyEvent[] = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    const event = validateEvent(parsed);
    if (event !== null) events.push(event);
  }
  return events;
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
    async restore(nowMs) {
      let replayed = 0;
      for (const day of [yesterday(nowMs), new Date(nowMs)]) {
        let text: string;
        try {
          text = await readFile(join(opts.dir, logFileName(day)), 'utf8');
        } catch {
          continue; // missing or unreadable: skip (Requirement 17.5)
        }
        for (const event of parseLog(text)) {
          if (nowMs - Date.parse(event.at) > SESSION_TTL_MS) continue;
          list = applyEvent(list, event, ++seq).list;
          replayed++;
        }
      }
      prune(nowMs);
      return replayed;
    },
    buddy: (key) => groupBuddies(list).get(key),
    buddies: () => [...groupBuddies(list).values()],
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
