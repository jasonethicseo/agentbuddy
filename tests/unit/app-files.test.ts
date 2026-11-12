// App files in a temp folder: settings and the inbox (messenger-app Requirements 11.2, 11.4, 11.5, 13.5, 14.2, 14.3, 17.1).
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { InboxRecord } from '../../src/core/attention';
import { createInboxWriter, inboxFileName, readInbox } from '../../src/app/inbox-file';
import { DEFAULT_SETTINGS, SETTINGS_FILE, loadSettings, parseSettings, saveSettings } from '../../src/app/settings';

let dir: string;
beforeEach(() => {
  dir = join(mkdtempSync(join(tmpdir(), 'agentbuddy-app-')), '.agentbuddy');
});
afterEach(() => rmSync(join(dir, '..'), { recursive: true, force: true }));

const NOW = Date.parse('2026-11-12T05:00:00.000Z');
const ping = (session: string, at = new Date(NOW).toISOString()): InboxRecord => ({
  t: 'ping', at, session, buddyName: 'Kiro @ demo', startedAt: at, state: 'TURN_DONE',
});

describe('settings', () => {
  it('uses the defaults when the file is missing, unreadable or invalid', async () => {
    expect(await loadSettings(dir)).toEqual(DEFAULT_SETTINGS);
    mkdirSync(dir, { recursive: true });
    for (const text of ['not json', '[]', 'null', '{"hideText":"yes"}']) {
      writeFileSync(join(dir, SETTINGS_FILE), text);
      expect(await loadSettings(dir)).toEqual(DEFAULT_SETTINGS);
    }
    expect(DEFAULT_SETTINGS).toMatchObject({ hideText: false, sound: true, popups: true, macNotifications: false, alwaysOnTop: true });
  });

  it('takes only known keys with values of the right type', () => {
    const s = parseSettings({
      hideText: true, sound: 0, popups: false, macNotifications: 'on', alwaysOnTop: false, extra: true,
      closedGroups: ['/Users/dev/demo', 7, '', '/Users/dev/demo', 'x'.repeat(1025)],
      hidden: { '["claude","e697…"]': { lastAt: '2026-11-12T04:00:00.000Z', hiddenAt: '2026-11-12T04:01:00.000Z' }, bad: { lastAt: 'x', hiddenAt: 1 } },
    });
    expect(s).toMatchObject({ hideText: true, sound: true, popups: false, macNotifications: false, alwaysOnTop: false, closedGroups: ['/Users/dev/demo'] });
    expect(s).not.toHaveProperty('extra');
    expect([...s.hidden]).toEqual([['["claude","e697…"]', { lastAtMs: Date.parse('2026-11-12T04:00:00.000Z'), hiddenAtMs: Date.parse('2026-11-12T04:01:00.000Z') }]]);
  });

  it('caps closed groups at 200 and hidden marks at 500', () => {
    const many = Array.from({ length: 600 }, (_, i) => `/Users/dev/p${i}`);
    const hidden = Object.fromEntries(many.map((k) => [k, { lastAt: '2026-11-12T04:00:00Z', hiddenAt: '2026-11-12T04:00:00Z' }]));
    const s = parseSettings({ closedGroups: many, hidden });
    expect([s.closedGroups.length, s.hidden.size]).toEqual([200, 500]);
  });

  it('saves atomically with mode 600 and reads back the same settings', async () => {
    const s = parseSettings({ hideText: true, closedGroups: ['/Users/dev/demo'] });
    s.hidden = new Map([['["kiro","sess_ce19…"]', { lastAtMs: NOW - 1000, hiddenAtMs: NOW }]]);
    await saveSettings(dir, s);
    await saveSettings(dir, s);
    expect(statSync(join(dir, SETTINGS_FILE)).mode & 0o777).toBe(0o600);
    expect(statSync(dir).mode & 0o777).toBe(0o700);
    expect(readdirSync(dir)).toEqual([SETTINGS_FILE]);
    expect(await loadSettings(dir)).toEqual(s);
    expect(JSON.parse(readFileSync(join(dir, SETTINGS_FILE), 'utf8'))).toMatchObject({ v: 1, hideText: true });
  });
});

describe('inbox file', () => {
  it('appends in order to the file of the local date, with mode 600', async () => {
    const errors: string[] = [];
    const w = createInboxWriter(dir, (c) => errors.push(c));
    const records = [ping('a'), { t: 'ack', at: new Date(NOW + 1000).toISOString(), session: 'a' } as const, ping('b')];
    for (const r of records) w.append(r);
    await w.flush();
    const file = join(dir, inboxFileName(new Date(NOW)));
    expect(statSync(file).mode & 0o777).toBe(0o600);
    expect(await readInbox(dir, NOW)).toEqual(records);
    expect(errors).toEqual([]);
  });

  it('skips bad and cut-off lines, and gives nothing for a missing file', async () => {
    expect(await readInbox(dir, NOW)).toEqual([]);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, inboxFileName(new Date(NOW))), `${JSON.stringify(ping('a'))}\nnot json\n{"t":"ping","session":"b"}\n${JSON.stringify(ping('c')).slice(0, 30)}`);
    expect((await readInbox(dir, NOW)).map((r) => r.session)).toEqual(['a']);
  });

  it('reports a failed append and keeps going', async () => {
    mkdirSync(join(dir, inboxFileName(new Date(NOW))), { recursive: true }); // the file path is a folder
    const errors: string[] = [];
    const w = createInboxWriter(dir, (c) => errors.push(c));
    w.append(ping('a'));
    w.append(ping('b', new Date(NOW + 86_400_000).toISOString())); // next day's file still works
    await w.flush();
    expect(errors).toEqual(['EISDIR']);
    expect((await readInbox(dir, NOW + 86_400_000)).map((r) => r.session)).toEqual(['b']);
  });
});
