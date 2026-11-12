// The app's link to a relay: start its own with startRelay(), or attach to one that
// already runs on the port; read the stream; retry when it drops (messenger-app Requirements 4.3–4.7, 4.9).
// Plain module: no Electron. `start`, `connect` and `schedule` are injected so tests need no real time.
import { request } from 'node:http';
import type { BuddyView } from '../core/buddies';
import type { Connection, RelayMode } from '../core/snapshot';
import { PortInUseError } from '../relay/start';
import type { RelayHandle } from '../relay/start';
import { FIRST_LIST_MS, RETRY_MS, STALL_MS } from './config';
import { createSseParser, parseViews } from './sse';

export interface ConnectHandlers {
  onOpen(status: number, contentType: string): void;
  onChunk(text: string): void;
  /** The connection ended or failed. Not called after `close()`. */
  onEnd(): void;
}
export type Connect = (port: number, h: ConnectHandlers) => { close(): void };
/** Runs `fn` after `ms`; returns a function that cancels it. */
export type Schedule = (ms: number, fn: () => void) => () => void;

/** GET http://127.0.0.1:<port>/stream with no token (Requirement 4.9). */
export const httpConnect: Connect = (port, h) => {
  let done = false;
  const end = () => {
    if (done) return;
    done = true;
    h.onEnd();
  };
  const req = request({ host: '127.0.0.1', port, path: '/stream', headers: { host: `127.0.0.1:${port}`, accept: 'text/event-stream' }, agent: false });
  req.on('response', (res) => {
    if (done) return res.destroy();
    h.onOpen(res.statusCode ?? 0, String(res.headers['content-type'] ?? ''));
    res.setEncoding('utf8');
    res.on('data', (d: string) => !done && h.onChunk(d));
    res.on('end', end);
    res.on('close', end);
    res.on('error', end);
  });
  req.on('error', end);
  req.end();
  return {
    close() {
      done = true;
      req.destroy();
    },
  };
};

const realSchedule: Schedule = (ms, fn) => {
  const t = setTimeout(fn, ms);
  return () => clearTimeout(t);
};

export interface RelayLinkOptions {
  port: number;
  start: (port: number) => Promise<RelayHandle>;
  connect?: Connect;
  schedule?: Schedule;
  /** `baseline` is true for the first list of each connection: it never pings. */
  onList(list: BuddyView[], baseline: boolean): void;
  onLink(mode: RelayMode, connection: Connection, errorCode?: string): void;
}

export function createRelayLink(opts: RelayLinkOptions) {
  const connect = opts.connect ?? httpConnect;
  const schedule = opts.schedule ?? realSchedule;
  let own: RelayHandle | null = null;
  let mode: RelayMode = 'connecting';
  let stopped = false;
  let conn: { close(): void } | null = null;
  let timers: Array<() => void> = [];
  let stall: () => void = () => {};

  const clearTimers = () => {
    for (const cancel of timers.splice(0)) cancel();
    stall();
    stall = () => {};
  };
  /** No bytes for STALL_MS means a dead stream (the relay sends a heartbeat every 25 s). */
  const resetStall = () => {
    stall();
    stall = schedule(STALL_MS, () => fail('disconnected'));
  };

  /** End this attempt, report `connection`, and try again after RETRY_MS. */
  function fail(connection: Connection, code?: string): void {
    conn?.close();
    conn = null;
    clearTimers();
    if (stopped) return;
    opts.onLink(mode, connection, code);
    timers.push(schedule(RETRY_MS, () => void attempt()));
  }

  async function attempt(): Promise<void> {
    if (stopped) return;
    clearTimers();
    if (own === null) {
      try {
        const started = await opts.start(opts.port);
        if (stopped) return void (await started.stop());
        own = started;
        mode = 'own';
      } catch (err) {
        if (stopped) return;
        if (!(err instanceof PortInUseError)) return fail('error', (err as NodeJS.ErrnoException | null)?.code ?? 'unknown');
        mode = 'attached';
      }
    }
    let gotList = false;
    const parser = createSseParser((m) => {
      if (m.event !== 'buddies') return;
      const views = parseViews(m.data);
      if (views === null) return;
      const baseline = !gotList;
      gotList = true;
      if (baseline) {
        clearTimers();
        resetStall();
        opts.onLink(mode, 'ok');
      }
      opts.onList(views, baseline);
    });
    conn = connect(opts.port, {
      onOpen(status, type) {
        if (status !== 200 || !type.startsWith('text/event-stream')) fail('foreign');
      },
      onChunk(text) {
        if (gotList) resetStall();
        parser.push(text);
      },
      onEnd() {
        conn = null;
        fail('disconnected');
      },
    });
    // A program on the port that sends no list soon is not a relay (Requirement 4.5).
    timers.push(schedule(FIRST_LIST_MS, () => !gotList && fail('foreign')));
  }

  void attempt();

  return {
    /** Stops retrying and closes the stream; stops the app's own relay. An attached relay keeps running. */
    async stop(): Promise<void> {
      stopped = true;
      clearTimers();
      conn?.close();
      conn = null;
      const relay = own;
      own = null;
      await relay?.stop();
    },
  };
}
