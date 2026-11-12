// agentbuddy-hook end to end: spawns the built dist/hook.js with a temp HOME
// (Requirements 12.1–12.6, 13.1–13.7, 14.1–14.3).
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { IncomingHttpHeaders, Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FIXTURES } from '../fixtures/payloads';

const ROOT = join(import.meta.dirname, '../..');
const HOOK = join(ROOT, 'dist/hook.js');
const TOKEN = 'test-token-0123456789abcdef';
const fixture = (id: string) => FIXTURES.find((f) => f.id === id)!.raw;

interface RunResult {
  code: number | null;
  ms: number;
  stdout: string;
  stderr: string;
}

interface RunOptions {
  stdin?: string;
  keepStdinOpen?: boolean;
  port: number;
}

let home: string;

function run(args: string[], opts: RunOptions): Promise<RunResult> {
  return new Promise((resolve) => {
    const started = performance.now();
    const child = spawn(process.execPath, [HOOK, ...args], {
      env: { PATH: process.env['PATH'] ?? '', HOME: home, AGENTBUDDY_PORT: String(opts.port) },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.stdin.on('error', () => {}); // the hook may close stdin first
    if (opts.stdin !== undefined) child.stdin.write(opts.stdin);
    if (!opts.keepStdinOpen) child.stdin.end();
    child.on('exit', (code) => {
      child.stdin.destroy();
      resolve({ code, ms: performance.now() - started, stdout, stderr });
    });
  });
}

const errorLog = () => {
  const file = join(home, '.agentbuddy/hook-errors.log');
  return existsSync(file) ? readFileSync(file, 'utf8').trim().split('\n') : [];
};

const listen = (server: Server) =>
  new Promise<number>((resolve) => server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port)));

async function freePort(): Promise<number> {
  const server = createServer();
  const port = await listen(server);
  await new Promise((r) => server.close(r));
  return port;
}

interface Received {
  headers: IncomingHttpHeaders;
  body: string;
}

/** Fake relay. `answer: false` accepts the request and never replies. */
async function fakeRelay(answer: boolean | number) {
  const received: Received[] = [];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => {
      received.push({ headers: req.headers, body });
      if (answer !== false) res.writeHead(answer === true ? 204 : answer).end();
    });
  });
  const port = await listen(server);
  const close = () => {
    server.closeAllConnections();
    return new Promise((r) => server.close(r));
  };
  return { port, received, close };
}

beforeAll(() => {
  execFileSync(process.execPath, [join(ROOT, 'scripts/build-node.mjs')], { cwd: ROOT });
});

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'agentbuddy-hook-'));
  mkdirSync(join(home, '.agentbuddy'));
  writeFileSync(join(home, '.agentbuddy/token'), `${TOKEN}\n`);
});

afterEach(() => rmSync(home, { recursive: true, force: true }));

function expectQuietExit(r: RunResult, maxMs = 1000) {
  expect(r.code).toBe(0);
  expect(r.stdout).toBe('');
  expect(r.stderr).toBe('');
  expect(r.ms).toBeLessThan(maxMs);
}

describe('agentbuddy-hook', () => {
  it('POSTs the normalized event with the token, and logs nothing on success', async () => {
    const relay = await fakeRelay(true);
    const r = await run(['kiro'], { stdin: fixture('kiro-user-prompt-submit'), port: relay.port });
    await relay.close();
    expectQuietExit(r);
    expect(relay.received).toHaveLength(1);
    const { headers, body } = relay.received[0]!;
    expect(headers['x-agentbuddy-token']).toBe(TOKEN);
    expect(headers['content-type']).toBe('application/json');
    expect(headers['origin']).toBeUndefined();
    const event = JSON.parse(body);
    expect(event).toMatchObject({ v: 1, agent: 'kiro', kind: 'prompt', session: 'sess_ce19…', text: 'hello' });
    expect(Date.parse(event.at)).toBeGreaterThan(Date.now() - 5000);
    expect(errorLog()).toEqual([]);
  });

  it('reads the Codex payload from the last argv item without waiting for stdin', async () => {
    const relay = await fakeRelay(true);
    const r = await run(['codex', fixture('codex-turn-complete')], { keepStdinOpen: true, port: relay.port });
    await relay.close();
    expectQuietExit(r, 450); // well under the 500 ms stdin wait
    expect(JSON.parse(relay.received[0]!.body)).toMatchObject({ agent: 'codex', kind: 'stop', text: 'Created hello.txt.' });
  });

  it('sends nothing and logs nothing for a dropped payload', async () => {
    const relay = await fakeRelay(true);
    const r = await run(['codex', fixture('codex-title-turn')], { port: relay.port });
    await relay.close();
    expectQuietExit(r);
    expect(relay.received).toHaveLength(0);
    expect(errorLog()).toEqual([]);
  });

  it('exits 0 quickly when the relay is down', async () => {
    const r = await run(['claude'], { stdin: fixture('claude-stop'), port: await freePort() });
    expectQuietExit(r);
    expect(errorLog()).toEqual([expect.stringMatching(/ claude post_ECONNREFUSED$/)]);
  });

  it('aborts the POST after 300 ms when the relay never answers', async () => {
    const relay = await fakeRelay(false);
    const r = await run(['kiro'], { stdin: fixture('kiro-stop'), port: relay.port });
    await relay.close();
    expectQuietExit(r);
    expect(r.ms).toBeGreaterThan(300);
    expect(errorLog()).toEqual([expect.stringMatching(/ kiro post_timeout$/)]);
  });

  it('stops waiting for stdin after 500 ms and uses what arrived', async () => {
    const relay = await fakeRelay(true);
    const r = await run(['claude'], { stdin: fixture('claude-user-prompt-submit'), keepStdinOpen: true, port: relay.port });
    await relay.close();
    expectQuietExit(r);
    expect(r.ms).toBeGreaterThan(500);
    expect(relay.received).toHaveLength(1);
  });

  it('stays under 1 second with stdin held open and a relay that never answers', async () => {
    const relay = await fakeRelay(false);
    const r = await run(['kiro'], { stdin: fixture('kiro-stop'), keepStdinOpen: true, port: relay.port });
    await relay.close();
    expectQuietExit(r);
  });

  it('logs a non-2xx reply', async () => {
    const relay = await fakeRelay(401);
    const r = await run(['kiro'], { stdin: fixture('kiro-stop'), port: relay.port });
    await relay.close();
    expectQuietExit(r);
    expect(errorLog()).toEqual([expect.stringMatching(/ kiro http_401$/)]);
  });

  it('logs a missing token, an unknown agent, a missing Codex payload and oversized stdin', async () => {
    const port = await freePort();
    rmSync(join(home, '.agentbuddy/token'));
    expectQuietExit(await run(['kiro'], { stdin: fixture('kiro-stop'), port }));
    expectQuietExit(await run(['cursor'], { stdin: '{}', port }));
    expectQuietExit(await run([], { port }));
    expectQuietExit(await run(['codex'], { port }));
    expectQuietExit(await run(['claude'], { stdin: 'x'.repeat(1_100_000), port }));
    expect(errorLog().map((l) => l.split(' ').slice(1).join(' '))).toEqual([
      'kiro no_token',
      '- bad_agent',
      '- bad_agent',
      'codex no_payload',
      'claude too_large',
    ]);
  });

  it('writes only fixed codes to the error log, never payload text or the token', async () => {
    const port = await freePort();
    await run(['claude'], { stdin: fixture('claude-stop'), port });
    await run(['kiro'], { stdin: fixture('kiro-pre-task-exec'), port });
    const log = readFileSync(join(home, '.agentbuddy/hook-errors.log'), 'utf8');
    for (const line of log.trim().split('\n')) {
      expect(line).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z (kiro|claude|codex|-) [a-z]+(_[A-Za-z0-9]+)*$/);
    }
    for (const secret of [TOKEN, 'hello.txt', '/Users/dev', 'sess_']) expect(log).not.toContain(secret);
  });

  it('creates the home folder for the log when it does not exist', async () => {
    rmSync(join(home, '.agentbuddy'), { recursive: true });
    expectQuietExit(await run(['kiro'], { stdin: fixture('kiro-stop'), port: await freePort() }));
    expect(errorLog()).toEqual([expect.stringMatching(/ kiro no_token$/)]);
  });
});
