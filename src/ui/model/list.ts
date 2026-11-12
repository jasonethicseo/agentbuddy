// The buddy list as plain data: folder groups, the offline group, buddy rows, session rows
// and the hidden-sessions line (messenger-app Requirements 6.1–6.8, 7, 13.3).
// Pure: the screens turn it into DOM. Time comes in through `Clock`.
import type { BuddyView, SessionView } from '../../core/buddies';
import type { AgentId } from '../../core/event';
import type { AppSnapshot } from '../../core/snapshot';
import type { DisplayState } from '../../core/state';
import { AGENT_NAMES, PHRASES, folderName, statusParts } from '../../core/text';
import type { StatusParts } from '../../core/text';

/** Id of the last group. Not an absolute path, so it never collides with a folder. */
export const OFFLINE_GROUP = '*offline';
export const CODEX_NOTE = 'Codex reports finished turns only';
const AGENT_ORDER: readonly AgentId[] = ['kiro', 'claude', 'codex'];
const QUIET: ReadonlySet<DisplayState> = new Set(['IDLE', 'OFFLINE', 'ENDED']);

export interface Clock {
  nowMs: number;
  /** Local `HH:MM`, or `HH:MM:SS` with `seconds`. */
  time(ms: number, seconds: boolean): string;
}

export interface SessionVM {
  key: string;
  state: DisplayState;
  name: string;
  phrase: string;
  age: string;
  /** The session that sets the buddy state. */
  top: boolean;
  tree: '├' | '└';
  unread: boolean;
  /** Has a × (app only). */
  canHide: boolean;
}

export interface BuddyVM {
  key: string;
  agent: AgentId;
  name: string;
  state: DisplayState;
  parts: StatusParts;
  /** `[n]` when two or more sessions are visible. */
  count?: number;
  unread: boolean;
  progress?: { text: string; ratio?: number };
  hover?: string;
  /** The session key behind the buddy row's × when exactly one session is visible (app only). */
  hide?: string;
  sessions: SessionVM[];
  /** The line that counts left-out sessions, e.g. `2 logged off`; `shown` while they are shown. */
  more?: { text: string; shown: boolean };
}

export interface GroupVM {
  id: string;
  kind: 'folder' | 'offline';
  label: string;
  /** Full folder, shown on hover. */
  path?: string;
  online: number;
  total: number;
  open: boolean;
  /**
   * What to send to flip the group: `setGroupOpen(key, open)`. Settings list folder groups
   * that are closed; the offline group is closed by default, so its entry there means "open".
   */
  toggle: { key: string; open: boolean };
  buddies: BuddyVM[];
}

const isOnline = (b: BuddyView) => b.sessions.some((s) => s.state !== 'OFFLINE' && s.state !== 'ENDED');
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** `now` under a minute, `Nm` under an hour, else `Nh`. */
export function age(lastAt: string, nowMs: number): string {
  const ms = Date.parse(lastAt);
  if (!Number.isFinite(ms)) return '';
  const sec = Math.max(0, Math.floor((nowMs - ms) / 1000));
  if (sec < 60) return 'now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  return `${Math.floor(sec / 3600)}h`;
}

/** The session title, or `started HH:MM:SS` when it has none or text is hidden. */
export function sessionName(s: { title?: string; startedAt: string }, hideText: boolean, clock: Clock): string {
  if (!hideText && s.title !== undefined) return s.title;
  const ms = Date.parse(s.startedAt);
  return Number.isFinite(ms) ? `started ${clock.time(ms, true)}` : 'started';
}

function moreText(left: readonly SessionView[], hidden: ReadonlySet<string>): string {
  const counts = { idle: 0, offline: 0, 'logged off': 0, hidden: 0 };
  for (const s of left) {
    if (hidden.has(s.key)) counts.hidden++;
    else if (s.state === 'IDLE') counts.idle++;
    else if (s.state === 'OFFLINE') counts.offline++;
    else counts['logged off']++;
  }
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([label, n]) => `${n} ${label}`)
    .join(', ');
}

function buddyVM(b: BuddyView, s: AppSnapshot, inOffline: boolean, showMore: ReadonlySet<string>, clock: Clock): BuddyVM {
  const app = s.mode !== 'browser';
  const hideText = s.settings.hideText;
  const hidden = new Set(s.hidden);
  const unacked = new Set(s.unacked);
  const quiet = (x: SessionView) => QUIET.has(x.state) || hidden.has(x.key);
  const left = b.sessions.filter(quiet);
  const shown = showMore.has(b.key);
  const visible = shown ? b.sessions : b.sessions.filter((x) => !quiet(x));
  const first = b.sessions[0]!;
  const rows = visible.length >= 2 ? visible : [];
  const vm: BuddyVM = {
    key: b.key,
    agent: b.agent,
    name: inOffline ? b.name : AGENT_NAMES[b.agent],
    state: b.state,
    parts: statusParts(b.state, first.task === true, first.statusText, hideText),
    unread: b.sessions.some((x) => unacked.has(x.key)),
    sessions: rows.map((x, i) => ({
      key: x.key,
      state: x.state,
      name: sessionName(x, hideText, clock),
      phrase: statusParts(x.state, x.task === true, undefined, true).phrase,
      age: age(x.lastAt, clock.nowMs),
      top: x.key === first.key,
      tree: i === rows.length - 1 ? '└' : '├',
      unread: unacked.has(x.key),
      canHide: app,
    })),
  };
  if (visible.length >= 2) vm.count = visible.length;
  if (app && visible.length === 1) vm.hide = visible[0]!.key;
  if (left.length > 0) vm.more = { text: moreText(left, hidden), shown };
  if (b.agent === 'kiro') {
    const p = b.progress ?? null;
    vm.progress = p === null ? { text: '?/?' } : { text: `${p.done}/${p.total}`, ratio: p.total > 0 ? p.done / p.total : 0 };
  }
  if (b.agent === 'codex') vm.hover = CODEX_NOTE;
  return vm;
}

/** Groups in display order: folder groups by folder name, then path; the offline group last. */
export function buildGroups(s: AppSnapshot, showMore: ReadonlySet<string>, clock: Clock): GroupVM[] {
  const closed = new Set(s.settings.closedGroups);
  const byFolder = new Map<string, BuddyView[]>();
  for (const b of s.buddies) byFolder.set(b.cwd, [...(byFolder.get(b.cwd) ?? []), b]);
  const agentRank = (b: BuddyView) => AGENT_ORDER.indexOf(b.agent);

  const folders = [...byFolder.entries()]
    .map(([path, all]) => ({ path, all, online: all.filter(isOnline) }))
    .filter((f) => f.online.length > 0)
    .sort((a, b) => cmp(folderName(a.path), folderName(b.path)) || cmp(a.path, b.path));
  const nameCount = new Map<string, number>();
  for (const f of folders) nameCount.set(folderName(f.path), (nameCount.get(folderName(f.path)) ?? 0) + 1);

  const groups: GroupVM[] = folders.map((f) => {
    const name = folderName(f.path);
    const parent = f.path.split('/').filter((x) => x !== '').at(-2) ?? '/';
    const open = !closed.has(f.path);
    return {
      id: f.path,
      kind: 'folder',
      label: (nameCount.get(name) ?? 0) > 1 ? `${name} (${parent})` : name,
      path: f.path,
      online: f.online.length,
      total: f.all.length,
      open,
      toggle: { key: f.path, open: !open },
      buddies: [...f.online].sort((a, b) => agentRank(a) - agentRank(b)).map((b) => buddyVM(b, s, false, showMore, clock)),
    };
  });

  const offline = s.buddies
    .filter((b) => !isOnline(b))
    .sort((a, b) => cmp(folderName(a.cwd), folderName(b.cwd)) || cmp(a.cwd, b.cwd) || agentRank(a) - agentRank(b));
  if (offline.length > 0) {
    const open = closed.has(OFFLINE_GROUP);
    groups.push({
      id: OFFLINE_GROUP,
      kind: 'offline',
      label: 'offline',
      online: 0,
      total: offline.length,
      open,
      toggle: { key: OFFLINE_GROUP, open },
      buddies: offline.map((b) => buddyVM(b, s, true, showMore, clock)),
    });
  }
  return groups;
}

/** Plain-text phrase for a state, for places without colored parts. */
export const phraseOf = (state: DisplayState) => PHRASES[state];
