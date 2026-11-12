// The inbox file ~/.agentbuddy/inbox-YYYY-MM-DD.jsonl (mode 600): one InboxRecord per line,
// only ever appended (messenger-app Requirements 11.2, 11.4, 11.5, 11.7).
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateInboxRecord } from '../core/attention';
import type { InboxRecord } from '../core/attention';

const pad = (n: number) => String(n).padStart(2, '0');

/** `inbox-YYYY-MM-DD.jsonl` for the local date of `d`. */
export function inboxFileName(d: Date): string {
  return `inbox-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.jsonl`;
}

/** Valid records from one file's text, in file order. Bad and cut-off lines are skipped. */
export function parseInbox(text: string): InboxRecord[] {
  const out: InboxRecord[] = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    try {
      const r = validateInboxRecord(JSON.parse(line));
      if (r !== null) out.push(r);
    } catch {
      // a bad or cut-off line
    }
  }
  return out;
}

/** Today's records (local date of `nowMs`); none when the file is missing or unreadable. */
export async function readInbox(dir: string, nowMs: number): Promise<InboxRecord[]> {
  try {
    return parseInbox(await readFile(join(dir, inboxFileName(new Date(nowMs))), 'utf8'));
  } catch {
    return [];
  }
}

/**
 * Appends records in the order given, each to the file of its own `at` date.
 * A failed append calls `onError` with the errno code; the caller keeps the record in memory.
 */
export function createInboxWriter(dir: string, onError: (code: string) => void) {
  let chain: Promise<void> = Promise.resolve();
  return {
    append(record: InboxRecord): void {
      const file = join(dir, inboxFileName(new Date(Date.parse(record.at))));
      const line = `${JSON.stringify(record)}\n`;
      chain = chain
        .then(() => mkdir(dir, { recursive: true, mode: 0o700 }))
        .then(() => appendFile(file, line, { flag: 'a', mode: 0o600 }))
        .catch((err: NodeJS.ErrnoException) => onError(err.code ?? 'unknown'));
    },
    /** Resolves when every queued append has finished. */
    flush: (): Promise<void> => chain,
  };
}
