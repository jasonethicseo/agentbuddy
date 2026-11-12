// Launcher fields: the app an agent's hook process ran under (events.md
// "Normalized event"). The hook reads `__CFBundleIdentifier` and `TERM_PROGRAM`
// from its own environment and passes them in; only well-formed values are kept.
// Pure: no environment, file system, network, timers or clock.

/** Two or more dot-joined labels; each starts with an ASCII letter or digit, then letters, digits or `-`. */
const BUNDLE_ID = /^[A-Za-z0-9][A-Za-z0-9-]*(?:\.[A-Za-z0-9][A-Za-z0-9-]*)+$/;
export const BUNDLE_ID_MAX = 255;
/** An ASCII letter or digit, then up to 63 letters, digits, `.`, `_`, `+` or `-`. */
const TERM_PROGRAM = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/;

/**
 * True for a reverse-domain bundle ID such as `com.microsoft.VSCode`. The form
 * rules out spaces, quotes, `;`, `=`, `$`, `/` and a leading `-` or `.`, so a
 * value that passes can never be read as an option or as shell text.
 */
export function isBundleId(value: unknown): value is string {
  return typeof value === 'string' && value.length <= BUNDLE_ID_MAX && BUNDLE_ID.test(value);
}

/** True for a `TERM_PROGRAM` value such as `vscode` or `Apple_Terminal`. */
export function isTermProgram(value: unknown): value is string {
  return typeof value === 'string' && TERM_PROGRAM.test(value);
}

export interface LauncherEnv {
  bundleId?: string | undefined;
  termProgram?: string | undefined;
}

export interface Launcher {
  bundleId?: string;
  termProgram?: string;
}

/** The well-formed launcher values of `env`; a missing or malformed value is left out. */
export function launcherFields(env: LauncherEnv): Launcher {
  const out: Launcher = {};
  if (isBundleId(env.bundleId)) out.bundleId = env.bundleId;
  if (isTermProgram(env.termProgram)) out.termProgram = env.termProgram;
  return out;
}
