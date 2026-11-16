// App settings in ~/.agentbuddy/app-settings.json (mode 600): load and atomic save. The settings shape,
// defaults, parse and serialize are pure and live in settings-data.ts, re-exported here.
import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseSettings, serializeSettings } from './settings-data';
import type { Settings } from './settings-data';
export { DEFAULT_SETTINGS, MAX_CLOSED_GROUPS, MAX_HIDDEN, parseSettings, serializeSettings } from './settings-data';
export type { Settings } from './settings-data';
export const SETTINGS_FILE = 'app-settings.json';
/** The saved settings, or the defaults when the file is missing, unreadable or invalid. */
export async function loadSettings(dir: string): Promise<Settings> {
  try {
    return parseSettings(JSON.parse(await readFile(join(dir, SETTINGS_FILE), 'utf8')));
  } catch {
    return parseSettings(undefined);
  }
}

/** Writes a temporary file (mode 600) and renames it over the old one, so a crash never leaves half a file. */
export async function saveSettings(dir: string, s: Settings): Promise<void> {
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const tmp = join(dir, `${SETTINGS_FILE}.tmp`);
  await writeFile(tmp, serializeSettings(s), { mode: 0o600 });
  await chmod(tmp, 0o600);
  await rename(tmp, join(dir, SETTINGS_FILE));
}
