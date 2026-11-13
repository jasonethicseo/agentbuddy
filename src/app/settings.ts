// App settings in ~/.agentbuddy/app-settings.json (mode 600): the five switches,
// closed groups, hidden sessions and the "me" status message (messenger-app Requirements 13.5, 14.2, 14.3, 18.5).
// `parseSettings` is pure and never throws; load and save touch the file system.
import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { HiddenMap, HiddenMark } from '../core/attention';
import { KEY_MAX } from '../core/config';
import { isRecord } from '../core/event';
import type { PublicSettings } from '../core/snapshot';
import { cleanMyStatus } from '../core/text';
import { SETTING_KEYS } from './ipc';

export const SETTINGS_FILE = 'app-settings.json';
export const MAX_CLOSED_GROUPS = 200;
export const MAX_HIDDEN = 500;

export interface Settings extends PublicSettings {
  hidden: HiddenMap;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  hideText: false,
  sound: true,
  popups: true,
  macNotifications: false,
  alwaysOnTop: true,
  closedGroups: [],
  myStatus: '',
  hidden: new Map(),
};

const isText = (v: unknown): v is string => typeof v === 'string' && v !== '' && v.length <= KEY_MAX;
const timeMs = (v: unknown): number | null => (typeof v === 'string' && Number.isFinite(Date.parse(v)) ? Date.parse(v) : null);

function parseHidden(v: unknown): HiddenMap {
  const out = new Map<string, HiddenMark>();
  if (!isRecord(v)) return out;
  for (const [key, mark] of Object.entries(v)) {
    if (out.size >= MAX_HIDDEN) break;
    if (!isText(key) || !isRecord(mark)) continue;
    const lastAtMs = timeMs(mark['lastAt']);
    const hiddenAtMs = timeMs(mark['hiddenAt']);
    if (lastAtMs !== null && hiddenAtMs !== null) out.set(key, { lastAtMs, hiddenAtMs });
  }
  return out;
}

/** Known keys with values of the right type; everything else takes its default. Never throws. */
export function parseSettings(value: unknown): Settings {
  const s: Settings = { ...DEFAULT_SETTINGS, closedGroups: [], hidden: new Map() };
  try {
    if (!isRecord(value)) return s;
    for (const key of SETTING_KEYS) {
      const v = value[key];
      if (typeof v === 'boolean') s[key] = v;
    }
    const groups = value['closedGroups'];
    if (Array.isArray(groups)) s.closedGroups = [...new Set(groups.filter(isText))].slice(0, MAX_CLOSED_GROUPS);
    s.hidden = parseHidden(value['hidden']);
    const status = value['myStatus'];
    if (typeof status === 'string' && cleanMyStatus(status) === status) s.myStatus = status; // only a value that is already clean
    return s;
  } catch {
    return { ...DEFAULT_SETTINGS, closedGroups: [], hidden: new Map() };
  }
}

export function serializeSettings(s: Settings): string {
  const hidden: Record<string, { lastAt: string; hiddenAt: string }> = {};
  for (const [key, m] of s.hidden) {
    if (Number.isFinite(m.lastAtMs) && Number.isFinite(m.hiddenAtMs)) {
      hidden[key] = { lastAt: new Date(m.lastAtMs).toISOString(), hiddenAt: new Date(m.hiddenAtMs).toISOString() };
    }
  }
  const { hideText, sound, popups, macNotifications, alwaysOnTop, closedGroups, myStatus } = s;
  return `${JSON.stringify({ v: 1, hideText, sound, popups, macNotifications, alwaysOnTop, closedGroups, myStatus, hidden })}\n`;
}

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
