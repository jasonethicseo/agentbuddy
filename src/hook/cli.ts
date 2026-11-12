// agentbuddy-hook <agent>
//
// Reads one raw agent payload, normalizes it with the pure core, POSTs it to
// the local relay, and exits 0. It must never block or break the agent:
//   - exits 0 in every case, by 900 ms after process start at the latest
//   - Codex: payload is the last argv item; stdin is never read
//   - Kiro, Claude Code: stdin, awaited for at most 500 ms
//   - POST aborted after 300 ms
//   - writes nothing to stdout or stderr; failures go to
//     ~/.agentbuddy/hook-errors.log as fixed codes only (no payload, no token)

// Stamped first, before any input is read (Requirement 12.4).
const at = new Date().toISOString();

import { appendFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { request } from 'node:http';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { HOME_DIR, HOOK_ERROR_LOG, HOOK_LIMITS, TOKEN_FILE, parsePort } from '../core/config';
import { isAgentId } from '../core/event';
import type { AgentId } from '../core/event';
import { normalize } from '../core/normalize';

// Guard for Requirement 13.2: counts from process start, not module load.
setTimeout(() => process.exit(0), Math.max(0, HOOK_LIMITS.hardExitMs - process.uptime() * 1000));

const agentArg = process.argv[2];
const agentLabel = isAgentId(agentArg) ? agentArg : '-';

/** Append `<time> <agent> <code>` to the hook error log. Never throws. */
function logError(code: string): void {
  try {
    const dir = join(homedir(), HOME_DIR);
    const file = join(dir, HOOK_ERROR_LOG);
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    try {
      if (statSync(file).size > HOOK_LIMITS.maxErrorLogBytes) return;
    } catch {
      // No log yet.
    }
    appendFileSync(file, `${new Date().toISOString()} ${agentLabel} ${code}\n`, { mode: 0o600 });
  } catch {
    // Logging must never break the agent (Requirement 13.5).
  }
}

/** Fixed-format code for a network error; never includes a message. */
function errorCode(err: unknown): string {
  const e = err as { name?: unknown; code?: unknown } | null;
  if (e?.name === 'AbortError' || e?.code === 'ABORT_ERR') return 'post_timeout';
  return typeof e?.code === 'string' && /^[A-Z0-9_]{1,32}$/.test(e.code) ? `post_${e.code}` : 'post_error';
}

function finish(code?: string): never {
  if (code !== undefined) logError(code);
  process.exit(0);
}

process.on('uncaughtException', () => finish('internal'));
process.on('unhandledRejection', () => finish('internal'));

class TooLarge extends Error {}

/** stdin as text, waiting at most `stdinWaitMs`. Whatever arrived by then is the payload. */
function readStdin(): Promise<string> {
  const stdin = process.stdin;
  if (stdin.isTTY) return Promise.resolve('');
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const done = () => {
      clearTimeout(timer);
      stdin.removeAllListeners();
      stdin.destroy();
      resolve(Buffer.concat(chunks).toString('utf8'));
    };
    const timer = setTimeout(done, HOOK_LIMITS.stdinWaitMs);
    stdin.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > HOOK_LIMITS.maxStdinBytes) {
        clearTimeout(timer);
        stdin.destroy();
        reject(new TooLarge());
        return;
      }
      chunks.push(chunk);
    });
    stdin.on('end', done);
    stdin.on('error', done);
  });
}

async function readPayload(agent: AgentId): Promise<string | undefined> {
  if (agent === 'codex') return process.argv.length >= 4 ? process.argv.at(-1) : undefined;
  return readStdin();
}

function post(body: string, token: string, port: number): Promise<string | undefined> {
  return new Promise((resolve) => {
    const req = request(
      {
        host: '127.0.0.1',
        port,
        path: '/events',
        method: 'POST',
        agent: false,
        signal: AbortSignal.timeout(HOOK_LIMITS.postTimeoutMs),
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(body),
          'x-agentbuddy-token': token,
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        res.resume();
        resolve(status >= 200 && status < 300 ? undefined : `http_${status}`);
      },
    );
    req.on('error', (err) => resolve(errorCode(err)));
    req.end(body);
  });
}

async function main(): Promise<void> {
  if (!isAgentId(agentArg)) finish('bad_agent');

  let raw: string | undefined;
  try {
    raw = await readPayload(agentArg);
  } catch (err) {
    finish(err instanceof TooLarge ? 'too_large' : 'no_payload');
  }
  if (raw === undefined) finish('no_payload');

  const event = normalize(agentArg, raw, at, { projectDir: process.env['CLAUDE_PROJECT_DIR'] });
  if (event === null) finish(); // dropped by design, not an error (Requirement 12.6)

  let token: string;
  try {
    token = readFileSync(join(homedir(), HOME_DIR, TOKEN_FILE), 'utf8').trim();
  } catch {
    finish('no_token');
  }
  if (token === '') finish('no_token');

  finish(await post(JSON.stringify(event), token, parsePort(process.env['AGENTBUDDY_PORT'])));
}

main().catch(() => finish('internal'));
