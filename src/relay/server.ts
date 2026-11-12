// HTTP routes for the relay. Checks for POST /events, in order:
// Host (403) -> Origin (403) -> token (401) -> size (413) -> body (400) -> 204.

import { timingSafeEqual } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { RELAY_LIMITS } from '../core/config';
import { validateEvent } from '../core/event';
import type { BuddyEvent } from '../core/event';

export interface RelayDeps {
  port: number;
  token: string;
  uiDir: string;
  onEvent(event: BuddyEvent): void;
  onStream(res: ServerResponse): void;
}

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

const BASE_HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

function send(res: ServerResponse, status: number, extra: Record<string, string> = {}): void {
  res.writeHead(status, { ...BASE_HEADERS, ...extra }).end();
}

/** Reply, then drop the connection so an unread body is not processed. */
function reject(req: IncomingMessage, res: ServerResponse, status: number): void {
  res.writeHead(status, { ...BASE_HEADERS, Connection: 'close' });
  res.end(() => req.destroy());
}

function tokenMatches(header: string | string[] | undefined, token: string): boolean {
  if (typeof header !== 'string') return false;
  const given = Buffer.from(header);
  const expected = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

function readBody(req: IncomingMessage, limit: number): Promise<string | null> {
  return new Promise((done) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        req.removeAllListeners('data');
        done(null);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => done(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => done(null));
  });
}

async function handleEvent(req: IncomingMessage, res: ServerResponse, deps: RelayDeps): Promise<void> {
  if (req.headers.origin !== undefined) return reject(req, res, 403);
  if (!tokenMatches(req.headers['x-agentbuddy-token'], deps.token)) return reject(req, res, 401);
  const declared = Number(req.headers['content-length'] ?? 0);
  if (declared > RELAY_LIMITS.maxBodyBytes) return reject(req, res, 413);

  const body = await readBody(req, RELAY_LIMITS.maxBodyBytes);
  if (body === null) return reject(req, res, 413);
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return send(res, 400);
  }
  const event = validateEvent(parsed);
  if (event === null) return send(res, 400);
  deps.onEvent(event);
  send(res, 204);
}

async function serveStatic(path: string, res: ServerResponse, uiDir: string, head: boolean): Promise<void> {
  let decoded: string;
  try {
    decoded = decodeURIComponent(path === '/' ? '/index.html' : path);
  } catch {
    return send(res, 400);
  }
  const root = resolve(uiDir);
  const file = resolve(root, `.${decoded}`);
  if (decoded.includes('\0') || !file.startsWith(root + sep)) return send(res, 404);
  try {
    if (!(await stat(file)).isFile()) return send(res, 404);
    const data = await readFile(file);
    res.writeHead(200, {
      ...BASE_HEADERS,
      'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
      'Content-Security-Policy': "default-src 'self'",
    });
    res.end(head ? undefined : data);
  } catch {
    send(res, 404);
  }
}

export function createRelayServer(deps: RelayDeps): Server {
  const allowedHosts = new Set([`127.0.0.1:${deps.port}`, `localhost:${deps.port}`]);

  return createServer((req, res) => {
    // Against DNS rebinding: only our own host names (Requirement 15.3).
    if (!allowedHosts.has(req.headers.host ?? '')) return reject(req, res, 403);
    const path = (req.url ?? '/').split('?')[0] ?? '/';
    const method = req.method ?? 'GET';

    if (path === '/events') {
      if (method !== 'POST') return send(res, 405, { Allow: 'POST' });
      handleEvent(req, res, deps).catch(() => send(res, 500));
      return;
    }
    if (path === '/stream') {
      if (method !== 'GET') return send(res, 405, { Allow: 'GET' });
      return deps.onStream(res);
    }
    if (method !== 'GET' && method !== 'HEAD') return send(res, 404);
    serveStatic(path, res, deps.uiDir, method === 'HEAD').catch(() => send(res, 500));
  });
}
