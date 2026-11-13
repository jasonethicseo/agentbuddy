// The "me" row: cleaning, the 40-code-point limit, the saved value, the IPC check, the
// controller and the view model (messenger-app Requirements 18, 17.1).
import { describe, expect, it } from 'vitest';
import { createController } from '../../src/app/controller';
import type { Ports } from '../../src/app/controller';
import { UI_CHECKS } from '../../src/app/ipc';
import { parseSettings, serializeSettings } from '../../src/app/settings';
import type { AppSnapshot } from '../../src/core/snapshot';
import { cleanMyStatus, firstCodePoints } from '../../src/core/text';
import { limitStatusInput, meView } from '../../src/ui/model/me';
import { T0, buddyView, key, snapshot } from '../fixtures/views';

const FORTY = '가'.repeat(39) + '♪';

describe('cleanMyStatus', () => {
  it('turns runs of white space and control characters into one space and trims', () => {
    expect(cleanMyStatus('  ★ building\n\tAgentBuddy\u0000\u0007 ♪  ')).toBe('★ building AgentBuddy ♪');
    expect(cleanMyStatus('   ')).toBe('');
    expect(cleanMyStatus('')).toBe('');
  });
  it('counts code points, so 40 Korean syllables or astral characters fit', () => {
    expect(cleanMyStatus(FORTY)).toBe(FORTY);
    expect(cleanMyStatus('𝄞'.repeat(40))).toBe('𝄞'.repeat(40));
    expect(cleanMyStatus(FORTY + 'x')).toBeNull();
    expect(cleanMyStatus(` ${FORTY} `)).toBe(FORTY);
  });
  it('rejects anything that is not a string, and very long strings before cleaning', () => {
    for (const v of [undefined, null, 7, true, ['a'], { text: 'a' }]) expect(cleanMyStatus(v)).toBeNull();
    expect(cleanMyStatus(' '.repeat(1025))).toBeNull();
  });
});

describe('firstCodePoints and limitStatusInput', () => {
  it('cut to 40 code points with no ellipsis and never split a surrogate pair', () => {
    expect(limitStatusInput(FORTY + 'xyz')).toBe(FORTY);
    expect(limitStatusInput('𝄞'.repeat(41))).toBe('𝄞'.repeat(40));
    expect(limitStatusInput('short')).toBe('short');
    expect(firstCodePoints('abc', 2)).toBe('ab');
  });
});

describe('myStatus in the settings file', () => {
  it('defaults to empty and keeps only an already clean string of at most 40 code points', () => {
    expect(parseSettings({}).myStatus).toBe('');
    expect(parseSettings({ myStatus: '★ building AgentBuddy ♪' }).myStatus).toBe('★ building AgentBuddy ♪');
    for (const bad of [7, null, ['x'], FORTY + 'x', ' padded ', 'two\nlines']) expect(parseSettings({ myStatus: bad }).myStatus).toBe('');
  });
  it('is written and read back', () => {
    const s = parseSettings({ myStatus: '★ building AgentBuddy ♪' });
    expect(JSON.parse(serializeSettings(s))).toMatchObject({ myStatus: '★ building AgentBuddy ♪' });
    expect(parseSettings(JSON.parse(serializeSettings(s)))).toEqual(s);
  });
});

describe('ui:status', () => {
  it('passes the cleaned text and rejects everything else', () => {
    expect(UI_CHECKS['ui:status']({ text: ' brb ~ zZ\n' })).toEqual({ text: 'brb ~ zZ' });
    expect(UI_CHECKS['ui:status']({ text: '' })).toEqual({ text: '' });
    for (const v of [undefined, {}, { text: 7 }, { text: FORTY + 'x' }, 'text', Object.create({ text: 'x' })]) expect(UI_CHECKS['ui:status'](v)).toBeNull();
  });
});

describe('controller.onStatus', () => {
  function setup(hideText: boolean) {
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
    const c = createController({ settings: parseSettings({ hideText }), records: [], port: 4343 }, ports);
    c.onList([buddyView('kiro', '/Users/dev/demo', [{ key: key('kiro', 'sess_ce19…'), state: 'WORKING' }])], true);
    calls.splice(0);
    return { c, calls };
  }

  it('saves the message and pushes it to the window, and touches no other port (Requirement 18.5)', () => {
    const { c, calls } = setup(false);
    c.onStatus('★ building AgentBuddy ♪');
    expect(calls.map((x) => x[0]).sort()).toEqual(['pushState', 'saveSettings', 'setCount']);
    expect((calls.find((x) => x[0] === 'saveSettings')![1][0] as { myStatus: string }).myStatus).toBe('★ building AgentBuddy ♪');
    expect((calls.find((x) => x[0] === 'pushState')![1][0] as AppSnapshot).settings.myStatus).toBe('★ building AgentBuddy ♪');
  });

  it('does nothing when the message is unchanged', () => {
    const { c, calls } = setup(false);
    c.onStatus('');
    expect(calls).toEqual([]);
  });

  it('is the user\'s own text, so hide-text keeps it (Requirement 18.6)', () => {
    const { c, calls } = setup(true);
    c.onStatus('brb~');
    expect((calls.find((x) => x[0] === 'pushState')![1][0] as AppSnapshot).settings.myStatus).toBe('brb~');
  });
});

describe('meView', () => {
  const s = snapshot([], { mode: 'own' }, { myStatus: '★ building AgentBuddy ♪' });
  it('shows the row on the Buddies tab of the app only (Requirement 18.1)', () => {
    expect(meView(s, 'list')).toEqual({ text: '★ building AgentBuddy ♪', hint: false, theme: 'blue-bot' });
    expect(meView({ ...s, mode: 'attached' }, 'list')).not.toBeNull();
    expect(meView(s, 'inbox')).toBeNull();
    expect(meView(s, 'settings')).toBeNull();
    expect(meView({ ...s, mode: 'browser' }, 'list')).toBeNull();
  });
  it('asks for the hint when no message is set (Requirement 18.2)', () => {
    expect(meView(snapshot([], { mode: 'own' }), 'list')).toEqual({ text: '', hint: true, theme: 'blue-bot' });
    expect(meView(snapshot([], { mode: 'own' }, { theme: 'strawberry-milk' }), 'list')?.theme).toBe('strawberry-milk');
  });
});
