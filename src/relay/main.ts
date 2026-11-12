// agentbuddy: the local relay. Listens on 127.0.0.1 only.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RELAY_LIMITS, parsePort } from '../core/config';
import { ensureHome, loadOrCreateToken } from './home';
import { createRelayServer } from './server';
import { createStore } from './store';
import { createStream } from './stream';
import { createProgressReader } from './tasks';

const port = parsePort(process.env['AGENTBUDDY_PORT']);
const dir = ensureHome();
const token = loadOrCreateToken();
// dist/relay.js serves the UI built into dist/ui.
const uiDir = join(dirname(fileURLToPath(import.meta.url)), 'ui');

const store = createStore({ dir, onLogError: (code) => console.error(`log write failed: ${code}`) });
const stream = createStream(RELAY_LIMITS.heartbeatMs);

let lastSent = '';
function broadcastIfChanged(): void {
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
  port,
  token,
  uiDir,
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

// Drives the 10- and 30-minute rules and the 24-hour session removal (Requirements 10.7, 23.8).
const tick = setInterval(() => {
  store.prune(Date.now());
  broadcastIfChanged();
}, RELAY_LIMITS.tickMs);

server.on('error', (err: NodeJS.ErrnoException) => {
  console.error(err.code === 'EADDRINUSE' ? `port ${port} is in use (set AGENTBUDDY_PORT)` : `relay error: ${err.code ?? 'unknown'}`);
  process.exit(1);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`AgentBuddy relay: http://127.0.0.1:${port}/`);
});

function shutdown(): void {
  clearInterval(tick);
  stream.close();
  server.close();
  server.closeAllConnections();
  store.flush().finally(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
