// The theme setting in the settings file and in the controller (themes Requirements 1, 2.6, 11.1).
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createController } from '../../src/app/controller';
import type { Ports } from '../../src/app/controller';
import { DEFAULT_SETTINGS, SETTINGS_FILE, loadSettings, parseSettings, saveSettings } from '../../src/app/settings';
import { UI_CHECKS } from '../../src/app/ipc';
import type { AppSnapshot } from '../../src/core/snapshot';
import { T0, buddyView, key } from '../fixtures/views';

let dir: string;
beforeEach(() => {
  dir = join(mkdtempSync(join(tmpdir(), 'ab-theme-')), 'home');
});
afterEach(() => rmSync(join(dir, '..'), { recursive: true, force: true }));

describe('theme in app-settings.json', () => {
  it('defaults to blue-bot', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('blue-bot');
    expect(parseSettings({}).theme).toBe('blue-bot');
  });

  it('a file written before themes loads with every other setting unchanged (Requirement 1.2)', async () => {
    mkdirSync(dir, { recursive: true });
    const old = {
      v: 1, hideText: true, sound: false, popups: true, macNotifications: false, alwaysOnTop: false,
      closedGroups: ['/Users/dev/demo'], myStatus: 'brb~', hidden: { '["claude","e697…"]': { lastAt: '2026-11-12T04:00:00.000Z', hiddenAt: '2026-11-12T04:01:00.000Z' } },
    };
    writeFileSync(join(dir, SETTINGS_FILE), JSON.stringify(old));
    const s = await loadSettings(dir);
    expect(s).toMatchObject({ hideText: true, sound: false, popups: true, macNotifications: false, alwaysOnTop: false, closedGroups: ['/Users/dev/demo'], myStatus: 'brb~', theme: 'blue-bot' });
    expect(s.hidden.size).toBe(1);
  });

  it('keeps strawberry-milk and turns any other value into blue-bot', () => {
    expect(parseSettings({ theme: 'strawberry-milk' }).theme).toBe('strawberry-milk');
    for (const theme of ['pink', 'Strawberry-Milk', '', null, 3, ['strawberry-milk'], { id: 'strawberry-milk' }]) {
      const s = parseSettings({ theme, sound: false });
      expect([s.theme, s.sound]).toEqual(['blue-bot', false]);
    }
  });

  it('is saved and read back (mode 600, atomic)', async () => {
    const s = parseSettings({ theme: 'strawberry-milk', hideText: true });
    await saveSettings(dir, s);
    expect(JSON.parse(readFileSync(join(dir, SETTINGS_FILE), 'utf8'))).toMatchObject({ theme: 'strawberry-milk', hideText: true });
    expect(await loadSettings(dir)).toEqual(s);
  });
});

describe('controller.onTheme (Requirement 2.6)', () => {
  function setup() {
    const calls: Array<[string, unknown[]]> = [];
    const rec = (name: string) => (...args: unknown[]) => void calls.push([name, args]);
    const ports: Ports = {
      now: () => T0,
      dayKey: (ms) => new Date(ms).toISOString().slice(0, 10),
      formatTime: (ms) => new Date(ms).toISOString().slice(11, 16),
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
    };
    const c = createController({ settings: parseSettings({}), records: [], port: 4343 }, ports);
    c.onList([buddyView('claude', '/Users/dev/demo', [{ key: key('claude', 'e697…'), state: 'TURN_DONE' }])], true);
    calls.splice(0);
    return { c, calls };
  }

  it('saves the theme, sends it to the windows and pushes state, and does nothing else', () => {
    const { c, calls } = setup();
    c.onTheme('strawberry-milk');
    expect(calls.map((x) => x[0]).sort()).toEqual(['applyTheme', 'pushState', 'saveSettings', 'setCount']);
    expect(calls.find((x) => x[0] === 'applyTheme')![1]).toEqual(['strawberry-milk']);
    expect((calls.find((x) => x[0] === 'saveSettings')![1][0] as { theme: string }).theme).toBe('strawberry-milk');
    expect((calls.find((x) => x[0] === 'pushState')![1][0] as AppSnapshot).settings.theme).toBe('strawberry-milk');
  });

  it('does nothing when the theme is already set', () => {
    const { c, calls } = setup();
    c.onTheme('blue-bot');
    expect(calls).toEqual([]);
  });

  it('keeps the count and the inbox as they were', () => {
    const { c, calls } = setup();
    c.onTheme('strawberry-milk');
    const s = calls.find((x) => x[0] === 'pushState')![1][0] as AppSnapshot;
    expect([s.inbox, s.count.total]).toEqual([[], 0]);
    expect(calls.find((x) => x[0] === 'setCount')![1]).toEqual([0]);
  });
});
describe('hideBanner in app-settings.json (retro-skin Requirement 10)', () => {
  it('is false by default, in old files and for anything but a boolean', () => {
    expect(DEFAULT_SETTINGS.hideBanner).toBe(false);
    expect(parseSettings({ theme: 'strawberry-milk', sound: false }).hideBanner).toBe(false);
    for (const hideBanner of ['true', 1, null, [], { on: true }, '']) {
      const s = parseSettings({ hideBanner, sound: false, theme: 'strawberry-milk' });
      expect([s.hideBanner, s.sound, s.theme]).toEqual([false, false, 'strawberry-milk']);
    }
    expect(parseSettings({ hideBanner: true }).hideBanner).toBe(true);
  });
  it('is saved and read back with the other settings', async () => {
    const s = parseSettings({ hideBanner: true, theme: 'strawberry-milk', hideText: true });
    await saveSettings(dir, s);
    expect(JSON.parse(readFileSync(join(dir, SETTINGS_FILE), 'utf8'))).toMatchObject({ hideBanner: true, theme: 'strawberry-milk', hideText: true });
    expect(await loadSettings(dir)).toEqual(s);
  });
  it('a window may change it only with a boolean (ui:setting)', () => {
    expect(UI_CHECKS['ui:setting']({ key: 'hideBanner', value: true })).toEqual({ key: 'hideBanner', value: true });
    expect(UI_CHECKS['ui:setting']({ key: 'hideBanner', value: 'yes' })).toBeNull();
    expect(UI_CHECKS['ui:setting']({ key: 'hideBanner', value: 1 })).toBeNull();
  });
});
