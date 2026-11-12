// agentbuddy: the local relay command. Listens on 127.0.0.1 only.
// The relay itself is startRelay(); this file only adds the command's messages,
// exit codes and signal handling.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePort } from '../core/config';
import { PortInUseError, startRelay } from './start';

const port = parsePort(process.env['AGENTBUDDY_PORT']);
// dist/relay.js serves the UI built into dist/ui.
const uiDir = join(dirname(fileURLToPath(import.meta.url)), 'ui');

try {
  const relay = await startRelay({ port, uiDir, onMessage: (text) => console.error(text) });
  console.log(`AgentBuddy relay: http://127.0.0.1:${port}/ (restored ${relay.restored} events from the last 24 hours)`);
  const shutdown = () => {
    relay.stop().finally(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (err) {
  const code = (err as NodeJS.ErrnoException | null)?.code;
  console.error(err instanceof PortInUseError ? `port ${port} is in use (set AGENTBUDDY_PORT)` : `relay error: ${code ?? 'unknown'}`);
  process.exit(1);
}
