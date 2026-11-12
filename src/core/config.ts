// Shared constants for the hook command, the relay and the tests.
// Pure: no environment, file system or clock access. Callers pass values in.

export const DEFAULT_PORT = 4343;

/** Maximum length of `text` and `task.name`, in Unicode code points. */
export const TEXT_LIMIT = 120;

/** Events kept per buddy in its event window. */
export const WINDOW_SIZE = 50;

export const IDLE_AFTER_MS = 10 * 60_000;
export const OFFLINE_AFTER_MS = 30 * 60_000;

export const HOOK_LIMITS = {
  stdinWaitMs: 500,
  postTimeoutMs: 300,
  hardExitMs: 900,
  maxStdinBytes: 1_048_576,
  maxErrorLogBytes: 1_048_576,
} as const;

export const RELAY_LIMITS = {
  maxBodyBytes: 16_384,
  tickMs: 30_000,
  heartbeatMs: 25_000,
  maxTasksFileBytes: 1_048_576,
  restoreWindowMs: 24 * 3_600_000,
} as const;

/** Folder under the user's home directory, and file names inside it. */
export const HOME_DIR = '.agentbuddy';
export const TOKEN_FILE = 'token';
export const HOOK_ERROR_LOG = 'hook-errors.log';

/**
 * Port from an `AGENTBUDDY_PORT` value. Only a plain decimal integer in
 * 1..65535 is accepted; anything else gives `DEFAULT_PORT`.
 */
export function parsePort(value: string | undefined): number {
  if (value === undefined || !/^\d{1,5}$/.test(value)) return DEFAULT_PORT;
  const port = Number(value);
  return port >= 1 && port <= 65_535 ? port : DEFAULT_PORT;
}
