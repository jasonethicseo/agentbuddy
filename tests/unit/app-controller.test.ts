// The app controller end to end on fake ports and a fake clock
// (messenger-app Requirements 5.3, 7.4, 8.2–8.9, 9.5–9.8, 10, 12.1, 12.2, 13, 14, 17.1).
import { describe, expect, it } from 'vitest';
import type { BuddyView } from '../../src/core/buddies';
import type { InboxRecord } from '../../src/core/attention';
import type { DisplayState } from '../../src/core/state';
import type { AppSnapshot } from '../../src/core/snapshot';
import { createController } from '../../src/app/controller';
import type { Ports } from '../../src/app/controller';
import { parseSettings } from '../../src/app/settings';
import { T0, buddyView, iso, key } from '../fixtures/views';

const A = key('claude', 'e697…');
const B = key('claude', '81fd…');
const K = key('kiro', 'sess_ce19…');

function list(a: DisplayState, b: DisplayState, k: DisplayState = 'IDLE'): BuddyView[] {
  const claude = buddyView('claude', '/Users/dev/demo', [
    { key: A, state: a, title: 'fix login', statusText: 'delete hello.txt?' },
    { key: B, state: b, statusText: 'Created hello.txt.' },
  ]);
  const kiro = buddyView('kiro', '/Users/dev/agentbuddy', [{ key: K, state: k, title: '16. Kiro progress', statusText: '16. Kiro progress' }]);
  claude.sessions[0]!.bundleId = 'com.anthropic.claudefordesktop';
  kiro.sessions[0]!.bundleId = 'dev.kiro.desktop';
  return [claude, kiro];
}

function setup(over: Record<string, unknown> = {}, records: InboxRecord[] = []) {
  let now = T0;
  const calls: Array<[string, unknown[]]> = [];
  const rec = (name: string) => (...args: unknown[]) => void calls.push([name, args]);
  const ports: Ports = {
    now: () => now,
    dayKey: (ms) => new Date(ms).toISOString().slice(0, 10),
    formatTime: (ms, s) => new Date(ms).toISOString().slice(11, s ? 19 : 16),
    appendInbox: rec('appendInbox'),
    saveSettings: rec('saveSettings'),
    pushState: rec('pushState'),
    setCount: rec('setCount'),
    ding: rec('ding'),
    showPopup: rec('showPopup'),
    closePopups: rec('closePopups'),
    notify: rec('notify'),
    jump: rec('jump'),
    notice: rec('notice'),
    applyAlwaysOnTop: rec('applyAlwaysOnTop'),
    applyTheme: rec('applyTheme'),
    windowAction: rec('windowAction'),
    isDirectory: (p) => p === '/Users/dev/agentbuddy',
  };
  const c = createController({ settings: parseSettings(over), records, port: 4343 }, ports);
  const of = (name: string) => calls.filter((x) => x[0] === name).map((x) => x[1]);
  return {
    c,
    of,
    calls,
    tick: (ms: number) => void (now += ms),
    state: () => of('pushState').at(-1)![0] as AppSnapshot,
    clear: () => void calls.splice(0),
  };
}

describe('controller: pings', () => {
  it('a baseline list gives no ding, pop-up or record; the next change does', () => {
    const t = setup();
    t.c.onList(list('TURN_DONE', 'WAITING_APPROVAL'), true);
    expect([t.of('ding'), t.of('showPopup'), t.of('appendInbox')]).toEqual([[], [], []]);
    expect(t.state().count).toEqual({ waiting: 1, unreadTurns: 0, total: 1 });
    t.c.onList(list('WORKING', 'WAITING_APPROVAL', 'WORKING'), false);
    t.tick(1000);
    t.c.onList(list('TURN_DONE', 'WAITING_APPROVAL', 'TURN_DONE'), false);
    expect(t.of('ding')).toHaveLength(1); // one ding for two pings
    expect(t.of('showPopup')).toEqual([
      [A, { kind: 'ping', state: 'TURN_DONE', agent: 'Claude Code', folder: 'demo', time: '05:00', phrase: '★ done~ your turn!', detail: 'delete hello.txt?' }],
      [K, { kind: 'ping', state: 'TURN_DONE', agent: 'Kiro', folder: 'agentbuddy', time: '05:00', phrase: '★ done~ your turn!', detail: '16. Kiro progress' }],
    ]);
    expect(t.of('appendInbox').map((a) => (a[0] as InboxRecord).session)).toEqual([A, K]);
    expect(t.of('setCount').at(-1)).toEqual([3]);
    expect(t.state().count).toEqual({ waiting: 1, unreadTurns: 2, total: 3 });
  });

  it('a waiting pop-up shows the session name; settings turn the sound, pop-ups and notifications on or off', () => {
    const t = setup({ sound: false, popups: false, macNotifications: true });
    t.c.onList(list('WORKING', 'WORKING'), true);
    t.c.onList(list('WAITING_APPROVAL', 'WORKING'), false);
    expect([t.of('ding'), t.of('showPopup')]).toEqual([[], []]);
    expect(t.of('notify')).toEqual([[A, 'Claude Code @ demo', 'need your OK T_T · fix login']]);
    expect(t.of('appendInbox')).toHaveLength(1); // the inbox records it anyway
    const u = setup();
    u.c.onList(list('WORKING', 'WORKING'), true);
    u.c.onList(list('WAITING_APPROVAL', 'WORKING'), false);
    expect((u.of('showPopup')[0]![1] as { detail: string }).detail).toBe('session · fix login');
    expect(u.of('notify')).toEqual([]);
  });
});

describe('controller: acknowledging', () => {
  function pinged() {
    const t = setup();
    t.c.onList(list('WORKING', 'WORKING', 'WORKING'), true);
    t.c.onList(list('TURN_DONE', 'TURN_DONE', 'TURN_DONE'), false);
    t.clear();
    return t;
  }

  it('a session row acknowledges and jumps; a buddy row acknowledges all its sessions and jumps to the first', () => {
    const t = pinged();
    t.c.onClick({ kind: 'session', key: K });
    expect(t.of('jump')).toEqual([[{ kind: 'run', bundleId: 'dev.kiro.desktop', folder: '/Users/dev/agentbuddy' }]]);
    expect(t.state().unacked.sort()).toEqual([A, B].sort());
    t.c.onClick({ kind: 'buddy', key: JSON.stringify(['claude', '/Users/dev/demo']) });
    expect(t.of('jump').at(-1)).toEqual([{ kind: 'run', bundleId: 'com.anthropic.claudefordesktop' }]);
    expect(t.state()).toMatchObject({ unacked: [], count: { total: 0 } });
    expect(t.of('closePopups')).toEqual([[[K]], [[A, B]]]);
  });

  it('pop-up: Go there jumps, × acknowledges without a jump, Later does neither', () => {
    const t = pinged();
    t.c.onPopup(A, 'later');
    expect([t.of('jump'), t.of('appendInbox')]).toEqual([[], []]);
    t.c.onPopup(A, 'close');
    expect(t.of('jump')).toEqual([]);
    expect(t.of('appendInbox')).toEqual([[{ t: 'ack', at: iso(T0), session: A }]]);
    t.c.onPopup(B, 'go');
    expect(t.of('jump')).toHaveLength(1);
    expect(t.state().count.unreadTurns).toBe(1);
  });

  it('a notification click and an inbox click acknowledge and jump; Mark all read acknowledges without a jump', () => {
    const t = pinged();
    t.c.onClick({ kind: 'notification', key: A });
    t.c.onClick({ kind: 'inbox', key: B });
    expect(t.of('jump')).toHaveLength(2);
    t.c.onAckAll();
    expect(t.of('jump')).toHaveLength(2);
    expect(t.state().count.total).toBe(0);
  });

  it('a click acknowledges even when the session is gone or has no launcher', () => {
    const t = pinged();
    t.c.onClick({ kind: 'session', key: B }); // no bundleId
    expect(t.of('jump')).toEqual([[{ kind: 'notice', text: "can't tell which app this session is in" }]]);
    expect(t.state().unacked).not.toContain(B);
    t.c.onClick({ kind: 'buddy', key: '["codex","/Users/dev/x"]' });
    expect(t.of('notice')).toEqual([['this session is gone']]);
  });

  it('× hides and acknowledges; a later event shows the session again; a hidden waiting session still counts', () => {
    const t = pinged();
    t.c.onHide(B);
    expect(t.state()).toMatchObject({ hidden: [B], count: { unreadTurns: 2 } });
    expect(t.of('saveSettings')).toHaveLength(1);
    const later = list('WAITING_APPROVAL', 'TURN_DONE', 'TURN_DONE');
    t.c.onList(later, false);
    t.c.onHide(A);
    expect(t.state()).toMatchObject({ hidden: [A, B], count: { waiting: 1 } });
    const moved = list('WAITING_APPROVAL', 'TURN_DONE', 'TURN_DONE');
    moved[0]!.sessions[1]!.lastAt = iso(T0 + 5000);
    t.c.onList(moved, false);
    expect(t.state().hidden).toEqual([A]);
  });
});

describe('controller: restart, settings, links and the day', () => {
  it('acknowledgements come back after a restart from the inbox records', () => {
    const at = iso(T0);
    const records: InboxRecord[] = [
      { t: 'ping', at, session: A, buddyName: 'Claude Code @ demo', startedAt: at, state: 'TURN_DONE' },
      { t: 'ping', at, session: B, buddyName: 'Claude Code @ demo', startedAt: at, state: 'TURN_DONE' },
      { t: 'ack', at, session: B },
      { t: 'ping', at: iso(T0 - 86_400_000), session: K, buddyName: 'Kiro @ agentbuddy', startedAt: at, state: 'TURN_DONE' },
    ];
    const t = setup({}, records);
    t.c.onList(list('TURN_DONE', 'TURN_DONE', 'TURN_DONE'), true);
    expect(t.state()).toMatchObject({ count: { unreadTurns: 1 }, unacked: [A] });
    expect(t.state().inbox).toHaveLength(2); // yesterday's record is left out
  });

  it('hide-text keeps prompt and reply text out of the window, pop-ups and notifications', () => {
    const t = setup({ hideText: true, macNotifications: true });
    t.c.onList(list('WORKING', 'WORKING', 'WORKING'), true);
    t.c.onList(list('TURN_DONE', 'WAITING_APPROVAL', 'TURN_DONE'), false);
    const shown = JSON.stringify(['pushState', 'showPopup', 'notify'].map((n) => t.of(n)));
    for (const text of ['fix login', 'delete hello.txt?', 'Created hello.txt.', '16. Kiro progress']) expect(shown).not.toContain(text);
    expect(t.of('notify')[0]![2]).toBe('★ done~ your turn!');
    expect(t.of('showPopup')[0]![1]).not.toHaveProperty('detail');
  });

  it('settings and groups are saved; always-on-top is applied; window buttons pass through', () => {
    const t = setup();
    t.c.onSetting('alwaysOnTop', false);
    t.c.onSetting('sound', false);
    t.c.onGroup('/Users/dev/demo', false);
    t.c.onGroup('/Users/dev/demo', false);
    expect(t.of('applyAlwaysOnTop')).toEqual([[false]]);
    expect(t.state().settings).toMatchObject({ alwaysOnTop: false, sound: false, closedGroups: ['/Users/dev/demo'] });
    t.c.onGroup('/Users/dev/demo', true);
    expect(t.state().settings.closedGroups).toEqual([]);
    expect(t.of('saveSettings')).toHaveLength(5);
    t.c.onWindow('minimize');
    expect(t.of('windowAction')).toEqual([['minimize']]);
  });

  it('shows the link state, with the error code only for errors', () => {
    const t = setup();
    t.c.onLink('connecting', 'error', 'EACCES');
    expect(t.state()).toMatchObject({ mode: 'connecting', connection: 'error', errorCode: 'EACCES', port: 4343 });
    t.c.onLink('attached', 'ok');
    expect(t.state()).not.toHaveProperty('errorCode');
  });

  it('a new day empties the inbox of earlier days; a hidden mark expires after 24 hours', () => {
    const t = setup();
    t.c.onList(list('WORKING', 'WORKING'), true);
    t.c.onList(list('TURN_DONE', 'WORKING'), false);
    t.c.onHide(B);
    t.tick(19 * 3_600_000); // 05:00 + 19 h = next day (UTC in this fake)
    t.c.onTick();
    expect(t.state()).toMatchObject({ inbox: [], hidden: [B] });
    t.tick(6 * 3_600_000);
    t.c.onTick();
    expect(t.state().hidden).toEqual([]);
  });
});
