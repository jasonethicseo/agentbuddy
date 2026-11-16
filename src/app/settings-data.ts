// App settings in ~/.agentbuddy/app-settings.json (mode 600): the six switches (hideBanner: retro-skin
// Requirement 10), the theme, closed groups, hidden sessions and the "me" status message
// (messenger-app Requirements 13.5, 14.2, 14.3, 18.5; themes Requirement 1).
// Pure: no file system. `parseSettings` never throws. The file is read and written by settings.ts;
// the demo page uses this module in a browser (submission design "Settings split").
import type { HiddenMap, HiddenMark } from '../core/attention';
import { KEY_MAX } from '../core/config';
import { isRecord } from '../core/event';
import type { PublicSettings } from '../core/snapshot';
import { cleanMyStatus } from '../core/text';
import { DEFAULT_THEME, parseTheme } from '../core/theme';
import { SETTING_KEYS } from './ipc';

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
  theme: DEFAULT_THEME,
  hideBanner: false,
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
    s.theme = parseTheme(value['theme']); // missing or unknown: blue-bot (themes Requirement 1.2)
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
  const { hideText, sound, popups, macNotifications, alwaysOnTop, theme, hideBanner, closedGroups, myStatus } = s;
  return `${JSON.stringify({ v: 1, hideText, sound, popups, macNotifications, alwaysOnTop, theme, hideBanner, closedGroups, myStatus, hidden })}\n`;
}
