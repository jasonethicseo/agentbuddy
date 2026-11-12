// Helpers for relay tests: spawn dist/relay.js with a temp HOME, raw HTTP requests, SSE reading.
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { createServer, request } from 'node:http';
import type { IncomingHttpHeaders, Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';

export const ROOT = join(import.meta.dirname, '../..');
export const RELAY = join(ROOT, 'dist/relay.js');

export const listen = (server: Server, host = '127.0.0.1') =>
  new Promise<number>((resolve) => server.listen(0, host, () => resolve((server.address() as AddressInfo).port)));

export async function freePort(): Promise<number> {
  const server = createServer();
  const port = await listen(server);
  await new Promise((r) => server.close(r));
  return port;
}

export interface RelayProcess {
  child: ChildProcess;
  port: number;
  stdout: () => string;
  stderr: () => string;
  stop: () => Promise<number | null>;
}

/** Starts the built relay and waits for its "AgentBuddy relay:" line. */
export function startRelay(home: string, port: number): Promise<RelayProcess> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [RELAY], {
      env: { PATH: process.env['PATH'] ?? '', HOME: home, AGENTBUDDY_PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    const exited = new Promise<number | null>((r) => child.on('exit', (code) => r(code)));
    const proc: RelayProcess = {
      child,
      port,
      stdout: () => out,
      stderr: () => err,
      stop: () => {
        child.kill('SIGTERM');
        return exited;
      },
    };
    child.stdout!.on('data', (d) => {
      out += d;
      if (out.includes('AgentBuddy relay:')) resolve(proc);
    });
    child.stderr!.on('data', (d) => (err += d));
    exited.then((code) => reject(new Error(`relay exited (${code}): ${err}`)));
  });
}

export interface Reply {
  status: number;
  headers: IncomingHttpHeaders;
  body: string;
}

export interface Req {
  port: number;
  method?: string;
  path?: string;
  headers?: Record<string, string | number>;
  body?: string | Buffer;
  /** Send the body in chunks without content-length. */
  chunked?: boolean;
  host?: string;
}

export function http(r: Req): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string | number> = { host: `127.0.0.1:${r.port}`, ...r.headers };
    if (r.body !== undefined && !r.chunked) headers['content-length'] = Buffer.byteLength(r.body);
    const req = request({ host: r.host ?? '127.0.0.1', port: r.port, method: r.method ?? 'GET', path: r.path ?? '/', headers, agent: false }, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
    });
    req.on('error', reject);
    if (r.body !== undefined && r.chunked) {
      const buf = Buffer.from(r.body);
      for (let i = 0; i < buf.length; i += 4096) req.write(buf.subarray(i, i + 4096));
      req.end();
    } else {
      req.end(r.body);
    }
  });
}

/** Opens GET /stream and collects `buddies` messages. */
export function openStream(port: number) {
  const messages: unknown[] = [];
  const waiters: Array<() => void> = [];
  let raw = '';
  const req = request({ host: '127.0.0.1', port, path: '/stream', headers: { host: `127.0.0.1:${port}` }, agent: false });
  const ready = new Promise<IncomingHttpHeaders>((resolve, reject) => {
    req.on('response', (res) => {
      res.setEncoding('utf8');
      res.on('data', (d: string) => {
        raw += d;
        let i;
        while ((i = raw.indexOf('\n\n')) >= 0) {
          const block = raw.slice(0, i);
          raw = raw.slice(i + 2);
          const data = block.split('\n').find((l) => l.startsWith('data: '));
          if (block.startsWith('event: buddies') && data) {
            messages.push(JSON.parse(data.slice(6)));
            waiters.splice(0).forEach((w) => w());
          }
        }
      });
      resolve(res.headers);
    });
    req.on('error', reject);
  });
  req.end();
  const next = (count: number) =>
    new Promise<unknown>((resolve) => {
      const check = () => (messages.length >= count ? resolve(messages[count - 1]) : waiters.push(check));
      check();
    });
  return { ready, messages, next, close: () => req.destroy() };
}
