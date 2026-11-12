#!/usr/bin/env node
// Observation probe, not part of the product.
//
//   node scripts/probe.mjs <agent>            raw payload on stdin (Kiro, Claude Code)
//   node scripts/probe.mjs codex '<json>'     raw payload as the last argument (Codex)
//
// Appends one line per call to ~/.agentbuddy/probe/<agent>.jsonl (folder 700, file 600):
//   { at, agent, source, argc, raw, launcher }
// `launcher` holds a few environment hints that tell a CLI from an app session.
// The file stays on this machine; it holds full raw payloads, so sanitize before
// copying anything into events.md. Like agentbuddy-hook, the probe never writes to
// stdout or stderr and always exits 0, at the latest 900 ms after process start.

const at = new Date().toISOString();

import { appendFileSync, mkdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

setTimeout(() => process.exit(0), Math.max(0, 900 - process.uptime() * 1000));
process.on('uncaughtException', () => process.exit(0));
process.on('unhandledRejection', () => process.exit(0));

const MAX_FILE_BYTES = 5 * 1_048_576;
const MAX_STDIN_BYTES = 1_048_576;
const STDIN_WAIT_MS = 500;
const LAUNCHER_KEYS = ['__CFBundleIdentifier', 'TERM_PROGRAM', 'CLAUDE_CODE_ENTRYPOINT', 'CODEX_INTERNAL_ORIGINATOR_OVERRIDE'];

const agent = /^[a-z]{1,16}$/.test(process.argv[2] ?? '') ? process.argv[2] : 'unknown';

function readStdin() {
  const stdin = process.stdin;
  if (stdin.isTTY) return Promise.resolve('');
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    const done = () => {
      clearTimeout(timer);
      stdin.removeAllListeners();
      stdin.destroy();
      resolve(Buffer.concat(chunks).toString('utf8'));
    };
    const timer = setTimeout(done, STDIN_WAIT_MS);
    stdin.on('data', (chunk) => {
      size += chunk.length;
      if (size <= MAX_STDIN_BYTES) chunks.push(chunk);
    });
    stdin.on('end', done);
    stdin.on('error', done);
  });
}

async function main() {
  const fromArgv = agent === 'codex';
  const raw = fromArgv ? (process.argv.length >= 4 ? process.argv.at(-1) : '') : await readStdin();
  const launcher = Object.fromEntries(LAUNCHER_KEYS.filter((k) => process.env[k]).map((k) => [k, process.env[k]]));
  const line = JSON.stringify({ at, agent, source: fromArgv ? 'argv' : 'stdin', argc: process.argv.length - 3, raw, launcher });

  const dir = join(homedir(), '.agentbuddy', 'probe');
  const file = join(dir, `${agent}.jsonl`);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  try {
    if (statSync(file).size > MAX_FILE_BYTES) return;
  } catch {
    // No file yet.
  }
  appendFileSync(file, `${line}\n`, { mode: 0o600 });
}

main()
  .catch(() => {})
  .finally(() => process.exit(0));
