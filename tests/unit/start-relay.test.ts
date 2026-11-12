// startRelay() in-process with a temp folder (messenger-app Requirements 3.1–3.4, 3.6, 17.1).
// The command wrapper (dist/relay.js) is covered by relay.test.ts, which spawns it.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logFileName } from '../../src/relay/home';
import { PortInUseError, startRelay } from '../../src/relay/start';
import type { RelayHandle } from '../../src/relay/start';
import { freePort, http, listen, openStream } from './relay-helpers';

let base: string;
let home: string;
let uiDir: string;
const running: RelayHandle[] = [];

const event = (at = new Date().toISOString()) => ({ v: 1, agent: 'kiro', session: 'sess_ce19…', kind: 'prompt', at, cwd: '/Users/dev/demo', text: 'hello' });
const post = (port: number, body: unknown) => {
  const token = readFileSync(join(home, 'token'), 'utf8').trim();
  return http({ port, method: 'POST', path: '/events', body: JSON.stringify(body), headers: { 'x-agentbuddy-token': token, 'content-type': 'application/json' } });
};
const refused = (port: number) => http({ port }).then(() => false, (err: NodeJS.ErrnoException) => err.code === 'ECONNREFUSED');

async function start(port: number, onMessage?: (t: string) => void) {
  const relay = await startRelay({ port, uiDir, home, ...(onMessage ? { onMessage } : {}) });
  running.push(relay);
  return relay;
}

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'agentbuddy-start-'));
  home = join(base, '.agentbuddy');
  uiDir = join(base, 'ui');
  mkdirSync(uiDir);
  writeFileSync(join(uiDir, 'index.html'), '<p>ok</p>');
});

afterEach(async () => {
  await Promise.all(running.splice(0).map((r) => r.stop()));
  rmSync(base, { recursive: true, force: true });
});

describe('startRelay', () => {
  it('creates the folder and token, listens, accepts events, streams, and serves the UI', async () => {
    const port = await freePort();
    const relay = await start(port);
    expect(relay).toMatchObject({ port, restored: 0 });
    expect(statSync(home).mode & 0o777).toBe(0o700);
    expect(statSync(join(home, 'token')).mode & 0o777).toBe(0o600);
    const stream = openStream(port);
    await stream.ready;
    expect(await stream.next(1)).toEqual([]);
    expect((await post(port, event())).status).toBe(204);
    expect(await stream.next(2)).toMatchObject([{ name: 'Kiro @ demo', state: 'WORKING' }]);
    stream.close();
    expect((await http({ port })).body).toBe('<p>ok</p>');
  });

  it('stop() closes everything, finishes the log, and frees the port', async () => {
    const port = await freePort();
    const relay = await start(port);
    const stream = openStream(port);
    await stream.ready;
    expect((await post(port, event())).status).toBe(204);
    await relay.stop();
    await relay.stop(); // a second stop is harmless
    expect(await refused(port)).toBe(true);
    const lines = readFileSync(join(home, logFileName(new Date())), 'utf8').trim().split('\n');
    expect(lines.map((l) => JSON.parse(l).kind)).toEqual(['prompt']);
  });

  it('restores the last 24 hours from the folder it is given', async () => {
    mkdirSync(home, { mode: 0o700 });
    writeFileSync(join(home, logFileName(new Date())), `${JSON.stringify(event())}\n`);
    const relay = await start(await freePort());
    expect(relay.restored).toBe(1);
  });

  it('rejects with PortInUseError and leaves nothing listening when the port is taken', async () => {
    const blocker = createServer();
    const port = await listen(blocker);
    const err = await startRelay({ port, uiDir, home }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PortInUseError);
    expect(err).toMatchObject({ code: 'PORT_IN_USE', port });
    await new Promise((r) => blocker.close(r));
    expect(await refused(port)).toBe(true);
    // The port is free again, so a new relay starts on it.
    await start(port);
    expect((await http({ port })).status).toBe(200);
  });

  it('passes log failures to onMessage, keeps the event, and writes nothing to stdout or stderr', async () => {
    mkdirSync(join(home, logFileName(new Date())), { recursive: true }); // the daily log path is a folder
    const out = vi.spyOn(process.stdout, 'write');
    const errs = vi.spyOn(process.stderr, 'write');
    const logs = vi.spyOn(console, 'log');
    const errors = vi.spyOn(console, 'error');
    const messages: string[] = [];
    try {
      const port = await freePort();
      const relay = await start(port, (t) => messages.push(t));
      const stream = openStream(port);
      await stream.ready;
      await stream.next(1);
      expect((await post(port, event())).status).toBe(204);
      expect(await stream.next(2)).toMatchObject([{ name: 'Kiro @ demo' }]);
      stream.close();
      await relay.stop();
      expect([out, errs, logs, errors].map((s) => s.mock.calls.length)).toEqual([0, 0, 0, 0]);
    } finally {
      for (const s of [out, errs, logs, errors]) s.mockRestore();
    }
    expect(messages).toEqual(['log write failed: EISDIR']);
  });
});
