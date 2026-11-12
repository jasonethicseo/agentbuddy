// Helpers for hook tests: spawn dist/hook.js with a temp HOME, a fake relay, the error log.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { IncomingHttpHeaders, Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect } from 'vitest';
import { FIXTURES } from '../fixtures/payloads';

const ROOT = join(import.meta.dirname, '../..');
const HOOK = join(ROOT, 'dist/hook.js');
export const TOKEN = 'test-token-0123456789abcdef';
export const fixture = (id: string) => FIXTURES.find((f) => f.id === id)!.raw;

export interface RunResult {
  code: number | null;
  ms: number;
  stdout: string;
  stderr: string;
}

interface RunOptions {
  stdin?: string;
  keepStdinOpen?: boolean;
  port: number;
  env?: Record<string, string>;
}

let home: string;

/** The temp HOME of the running test. */
export const homeDir = () => home;

export function run(args: string[], opts: RunOptions): Promise<RunResult> {
  return new Promise((resolve) => {
    const started = performance.now();
    const child = spawn(process.execPath, [HOOK, ...args], {
      env: { PATH: process.env['PATH'] ?? '', HOME: home, AGENTBUDDY_PORT: String(opts.port), ...opts.env },
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

export const errorLog = () => {
  const file = join(home, '.agentbuddy/hook-errors.log');
  return existsSync(file) ? readFileSync(file, 'utf8').trim().split('\n') : [];
};

const listen = (server: Server) =>
  new Promise<number>((resolve) => server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port)));

export async function freePort(): Promise<number> {
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
export async function fakeRelay(answer: boolean | number) {
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

/** Registers a fresh temp HOME with a token for each test of the calling file. */
export function useTempHome(): void {
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'agentbuddy-hook-'));
    mkdirSync(join(home, '.agentbuddy'));
    writeFileSync(join(home, '.agentbuddy/token'), `${TOKEN}\n`);
  });
  afterEach(() => rmSync(home, { recursive: true, force: true }));
}

export function expectQuietExit(r: RunResult, maxMs = 1000) {
  expect(r.code).toBe(0);
  expect(r.stdout).toBe('');
  expect(r.stderr).toBe('');
  expect(r.ms).toBeLessThan(maxMs);
}
