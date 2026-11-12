// startRelay(): the relay as a function, used by the `agentbuddy` command and by the
// desktop app (messenger-app Requirement 3). It never exits the process, adds no
// signal handlers and writes nothing to stdout or stderr; messages go to `onMessage`.
import type { Server } from 'node:http';
import { RELAY_LIMITS } from '../core/config';
import { ensureHome, loadOrCreateToken } from './home';
import { createRelayServer } from './server';
import { createStore } from './store';
import { createStream } from './stream';
import { createProgressReader } from './tasks';

export interface RelayOptions {
  port: number;
  /** Built UI served at `/`. */
  uiDir: string;
  /** The AgentBuddy folder; default `~/.agentbuddy`. */
  home?: string;
  /** Receives messages such as `log write failed: <code>`. Never event text. */
  onMessage?: (text: string) => void;
}

export interface RelayHandle {
  port: number;
  /** Events replayed from the last 24 hours of logs. */
  restored: number;
  /** Closes the server and the stream, clears the tick, and finishes pending log appends. */
  stop(): Promise<void>;
}

/** The port is taken by another program, perhaps another relay. */
export class PortInUseError extends Error {
  readonly code = 'PORT_IN_USE';
  constructor(readonly port: number) {
    super(`port ${port} is in use`);
    this.name = 'PortInUseError';
  }
}

function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const fail = (err: NodeJS.ErrnoException) => reject(err.code === 'EADDRINUSE' ? new PortInUseError(port) : err);
    server.once('error', fail);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', fail);
      resolve();
    });
  });
}

/** Resolves once the relay listens on 127.0.0.1:<port>. Rejects with `PortInUseError` when the port is taken. */
export async function startRelay(opts: RelayOptions): Promise<RelayHandle> {
  const say = opts.onMessage ?? (() => {});
  const dir = ensureHome(opts.home);
  const token = loadOrCreateToken(dir);
  const store = createStore({ dir, onLogError: (code) => say(`log write failed: ${code}`) });
  const stream = createStream(RELAY_LIMITS.heartbeatMs);
  let stopped = false;
  let lastSent = '';

  function broadcastIfChanged(): void {
    if (stopped) return;
    const views = store.views(Date.now());
    const json = JSON.stringify(views);
    if (json === lastSent) return;
    lastSent = json;
    stream.broadcast(views);
  }

  const refreshProgress = createProgressReader((key, progress) => {
    if (store.setProgress(key, progress)) broadcastIfChanged();
  });

  const server = createRelayServer({
    port: opts.port,
    token,
    uiDir: opts.uiDir,
    onEvent(event) {
      const { buddy } = store.accept(event, Date.now());
      broadcastIfChanged();
      // Kiro progress: re-read tasks.md on task start, task done and stop (events.md trap 4).
      if (event.agent === 'kiro' && (event.kind === 'task_start' || event.kind === 'task_done' || event.kind === 'stop')) {
        const b = store.buddy(buddy);
        if (b?.specPath !== undefined) void refreshProgress(b.key, b.specPath, b.cwd);
      }
    },
    onStream(res) {
      stream.add(res, store.views(Date.now()));
    },
  });

  // Restore the last 24 hours before accepting connections, then read Kiro progress once (core Requirement 17).
  const restored = await store.restore(Date.now());
  for (const b of store.buddies()) if (b.specPath !== undefined) void refreshProgress(b.key, b.specPath, b.cwd);

  try {
    await listen(server, opts.port);
  } catch (err) {
    stopped = true;
    stream.close();
    await store.flush();
    throw err;
  }
  server.on('error', (err: NodeJS.ErrnoException) => say(`relay error: ${err.code ?? 'unknown'}`));

  // Drives the 10- and 30-minute rules and the 24-hour session removal (core Requirements 10.7, 23.8).
  const tick = setInterval(() => {
    store.prune(Date.now());
    broadcastIfChanged();
  }, RELAY_LIMITS.tickMs);

  return {
    port: opts.port,
    restored,
    async stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(tick);
      stream.close();
      const closed = new Promise<void>((resolve) => server.close(() => resolve()));
      server.closeAllConnections();
      await closed;
      await store.flush();
    },
  };
}
