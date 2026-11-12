// agentbuddy: the local relay. Listens on 127.0.0.1 only.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RELAY_LIMITS, parsePort } from '../core/config';
import { ensureHome, loadOrCreateToken } from './home';
import { createRelayServer } from './server';
import { createStore } from './store';
import { createStream } from './stream';

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

const server = createRelayServer({
  port,
  token,
  uiDir,
  onEvent(event) {
    store.accept(event, Date.now());
    broadcastIfChanged();
  },
  onStream(res) {
    stream.add(res, store.views(Date.now()));
  },
});

// Drives the 10- and 30-minute rules (Requirement 10.7).
const tick = setInterval(broadcastIfChanged, RELAY_LIMITS.tickMs);

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
