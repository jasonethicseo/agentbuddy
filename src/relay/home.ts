// ~/.agentbuddy: folder, token file, and daily log names.

import { randomBytes } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { HOME_DIR, TOKEN_FILE } from '../core/config';

/** `~/.agentbuddy`. Every function below takes its folder as a parameter that defaults to this, so tests can use a temp folder. */
export function defaultHome(): string {
  return join(homedir(), HOME_DIR);
}
export function homePath(...parts: string[]): string {
  return join(defaultHome(), ...parts);
}

/** Creates the folder (default ~/.agentbuddy) with mode 700 if needed and returns its path. */
export function ensureHome(dir: string = defaultHome()): string {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

function readToken(file: string): string {
  try {
    return readFileSync(file, 'utf8').trim();
  } catch {
    return '';
  }
}

/**
 * Reads the token, or creates one: 32 random bytes as hex, file mode 600.
 * `wx` makes creation atomic; if another relay created it first, that token wins.
 */
export function loadOrCreateToken(dir: string = defaultHome()): string {
  const file = join(dir, TOKEN_FILE);
  const existing = readToken(file);
  if (existing !== '') {
    chmodSync(file, 0o600);
    return existing;
  }
  const token = randomBytes(32).toString('hex');
  try {
    writeFileSync(file, `${token}\n`, { flag: 'wx', mode: 0o600 });
    return token;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
  }
  const raced = readToken(file);
  if (raced !== '') return raced;
  // An empty token file: replace it.
  writeFileSync(file, `${token}\n`, { mode: 0o600 });
  chmodSync(file, 0o600);
  return token;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `events-YYYY-MM-DD.jsonl` for the local date of `d`. */
export function logFileName(d: Date): string {
  return `events-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.jsonl`;
}
