// The app's relay link: own or attached relay, foreign programs, drops and retries
// (messenger-app Requirements 4.3–4.7, 4.9, 17.1). Fake start, connect and clock; one real-relay check at the end.
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { BuddyView } from '../../src/core/buddies';
import type { Connection, RelayMode } from '../../src/core/snapshot';
import { FIRST_LIST_MS, RETRY_MS, STALL_MS } from '../../src/app/config';
import { createRelayLink } from '../../src/app/relay-link';
import type { ConnectHandlers } from '../../src/app/relay-link';
import { PortInUseError, startRelay } from '../../src/relay/start';
import type { RelayHandle } from '../../src/relay/start';
import { freePort, http } from './relay-helpers';

/** A manual clock: `advance(ms)` runs what is due. */
function clock() {
  let now = 0;
  let jobs: Array<{ at: number; fn: () => void }> = [];
  return {
    schedule: (ms: number, fn: () => void) => {
      const job = { at: now + ms, fn };
      jobs.push(job);
      return () => void (jobs = jobs.filter((j) => j !== job));
    },
    async advance(ms: number) {
      const end = now + ms;
      for (;;) {
        const due = jobs.filter((j) => j.at <= end).sort((a, b) => a.at - b.at)[0];
        if (!due) break;
        jobs = jobs.filter((j) => j !== due);
        now = due.at;
        due.fn();
        await flush();
      }
      now = end;
    },
    pending: () => jobs.length,
  };
}
const flush = () => new Promise((r) => setTimeout(r, 0));
const msg = (list: unknown) => `event: buddies\ndata: ${JSON.stringify(list)}\n\n`;
const LIST: BuddyView[] = [];

function harness(startResults: Array<'own' | 'in-use' | Error>) {
  const c = clock();
  const conns: Array<{ h: ConnectHandlers; closed: boolean }> = [];
  const links: Array<[RelayMode, Connection, string | undefined]> = [];
  const lists: Array<[BuddyView[], boolean]> = [];
  const ownStops: number[] = [];
  let starts = 0;
  const link = createRelayLink({
    port: 4343,
    async start() {
      starts++;
      const r = startResults.shift() ?? 'in-use';
      if (r === 'in-use') throw new PortInUseError(4343);
      if (r instanceof Error) throw r;
      return { port: 4343, restored: 0, stop: async () => void ownStops.push(starts) } satisfies RelayHandle;
    },
    connect(_port, h) {
      const entry = { h, closed: false };
      conns.push(entry);
      return { close: () => void (entry.closed = true) };
    },
    schedule: c.schedule,
    onList: (l, b) => lists.push([l, b]),
    onLink: (m, conn, code) => links.push([m, conn, code]),
  });
  const last = () => conns.at(-1)!;
  const open = () => last().h.onOpen(200, 'text/event-stream; charset=utf-8');
  return { c, conns, links, lists, ownStops, link, last, open, starts: () => starts };
}

describe('relay link', () => {
  it('starts its own relay when the port is free; the first list of a connection is a baseline', async () => {
    const t = harness(['own']);
    await flush();
    t.open();
    t.last().h.onChunk(msg(LIST));
    t.last().h.onChunk(': ping\n\n' + msg(LIST));
    expect(t.links).toEqual([['own', 'ok', undefined]]);
    expect(t.lists.map((l) => l[1])).toEqual([true, false]);
    await t.link.stop();
    expect(t.ownStops).toHaveLength(1);
    expect(t.last().closed).toBe(true);
  });

  it('attaches when the port is in use, and never stops a relay it did not start', async () => {
    const t = harness(['in-use']);
    await flush();
    t.open();
    t.last().h.onChunk(msg(LIST));
    expect(t.links).toEqual([['attached', 'ok', undefined]]);
    await t.link.stop();
    expect(t.ownStops).toEqual([]);
    expect(t.c.pending()).toBe(0);
  });

  it('calls a program that sends no list within 5 s foreign, and keeps retrying every 3 s', async () => {
    const t = harness(['in-use', 'in-use']);
    await flush();
    t.open();
    t.last().h.onChunk('HTTP junk without a list');
    await t.c.advance(FIRST_LIST_MS);
    expect(t.links).toEqual([['attached', 'foreign', undefined]]);
    expect(t.conns[0]!.closed).toBe(true);
    await t.c.advance(RETRY_MS);
    expect(t.starts()).toBe(2);
    expect(t.conns).toHaveLength(2);
    await t.link.stop();
  });

  it('calls a non-stream reply foreign at once', async () => {
    const t = harness(['in-use']);
    await flush();
    t.last().h.onOpen(404, 'text/html');
    expect(t.links).toEqual([['attached', 'foreign', undefined]]);
    await t.link.stop();
  });

  it('after a drop shows disconnected, retries, starts its own relay when the port is free, and treats the next list as a baseline', async () => {
    const t = harness(['in-use', 'own']);
    await flush();
    t.open();
    t.last().h.onChunk(msg(LIST));
    t.last().h.onEnd(); // the other relay went away
    expect(t.links.at(-1)).toEqual(['attached', 'disconnected', undefined]);
    await t.c.advance(RETRY_MS);
    t.open();
    t.last().h.onChunk(msg(LIST));
    expect(t.links.at(-1)).toEqual(['own', 'ok', undefined]);
    expect(t.lists.map((l) => l[1])).toEqual([true, true]);
    await t.link.stop();
    expect(t.ownStops).toHaveLength(1);
  });

  it('drops a stream that stays silent for 60 s, but not one that sends heartbeats', async () => {
    const t = harness(['in-use']);
    await flush();
    t.open();
    t.last().h.onChunk(msg(LIST));
    for (let i = 0; i < 5; i++) {
      await t.c.advance(25_000);
      t.last().h.onChunk(': ping\n\n');
    }
    expect(t.links).toEqual([['attached', 'ok', undefined]]);
    await t.c.advance(STALL_MS);
    expect(t.links.at(-1)).toEqual(['attached', 'disconnected', undefined]);
    expect(t.conns[0]!.closed).toBe(true);
    await t.link.stop();
  });

  it('reports other start errors with their code and retries', async () => {
    const t = harness([Object.assign(new Error('nope'), { code: 'EACCES' }), 'own']);
    await flush();
    expect(t.links).toEqual([['connecting', 'error', 'EACCES']]);
    await t.c.advance(RETRY_MS);
    expect(t.starts()).toBe(2);
    await t.link.stop();
  });
});

describe('relay link with real relays (in-process, temp folder)', () => {
  const cleanup: Array<() => Promise<unknown> | void> = [];
  afterEach(async () => {
    for (const f of cleanup.splice(0).reverse()) await f();
  });

  it('the first app starts its own relay, a second attaches, and stopping the second leaves the relay running', async () => {
    const base = mkdtempSync(join(tmpdir(), 'agentbuddy-link-'));
    cleanup.push(() => rmSync(base, { recursive: true, force: true }));
    mkdirSync(join(base, 'ui'));
    const port = await freePort();
    const start = (p: number) => startRelay({ port: p, uiDir: join(base, 'ui'), home: join(base, '.agentbuddy') });
    const seen: Record<string, Array<[RelayMode, Connection]>> = { a: [], b: [] };
    const make = (name: 'a' | 'b') => {
      let resolve: () => void;
      const ok = new Promise<void>((r) => (resolve = r));
      const link = createRelayLink({ port, start, onList() {}, onLink: (m, c) => (seen[name]!.push([m, c]), c === 'ok' && resolve()) });
      return { link, ok };
    };
    const a = make('a');
    cleanup.push(() => a.link.stop());
    await a.ok;
    const b = make('b');
    await b.ok;
    await b.link.stop();
    expect(seen).toEqual({ a: [['own', 'ok']], b: [['attached', 'ok']] });
    // The relay a started still answers after b stopped (no index.html in the empty UI folder, so 404).
    expect((await http({ port })).status).toBe(404);
    await a.link.stop();
    await expect(http({ port })).rejects.toMatchObject({ code: 'ECONNREFUSED' });
  });
});
