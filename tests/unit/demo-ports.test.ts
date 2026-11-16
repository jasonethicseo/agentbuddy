// The controller's ports on the demo page (submission Requirements 4.3–4.5): what only the desktop app
// can do becomes a notice in plain words, and nothing is stored outside the tab.
import { describe, expect, it } from 'vitest';
import { createController } from '../../src/app/controller';
import { NOTICES } from '../../src/app/jump';
import { DEMO_NOTICES, demoPorts, demoSettings, jumpNotice } from '../../src/demo/ports';
import { T0, buddyView, key } from '../fixtures/views';

function setup() {
  const notices: string[] = [];
  const states: unknown[] = [];
  const out = {
    pushState: (s: unknown) => void states.push(s),
    showPopup: () => {},
    closePopups: () => {},
    ding: () => {},
    notice: (t: string) => void notices.push(t),
    applyTheme: () => {},
  };
  const ports = demoPorts(out, () => T0);
  const c = createController({ settings: demoSettings(), records: [], port: 0 }, ports);
  c.onLink('demo', 'ok');
  return { c, ports, notices, states };
}

describe('demo ports', () => {
  it('names the app a jump would bring forward, and keeps the app notices as they are', () => {
    expect(jumpNotice({ kind: 'run', bundleId: 'com.anthropic.claudefordesktop' })).toBe('In the app, this brings the Claude app forward.');
    expect(jumpNotice({ kind: 'run', bundleId: 'dev.kiro.desktop' })).toBe('In the app, this brings Kiro forward.');
    expect(jumpNotice({ kind: 'run', bundleId: 'com.openai.codex' })).toBe('In the app, this brings the Codex app forward.');
    expect(jumpNotice({ kind: 'run', bundleId: 'org.example.app' })).toBe('In the app, this brings org.example.app forward.');
    expect(jumpNotice({ kind: 'notice', text: NOTICES.unknownApp })).toBe(NOTICES.unknownApp);
  });

  it('a click on a buddy gives the jump notice; window buttons, the pin and macOS notifications say they work in the app', () => {
    const { c, notices } = setup();
    const claude = buddyView('claude', '/Users/dev/webshop', [{ key: key('claude', 'c1d2…'), state: 'TURN_DONE' }]);
    claude.sessions[0]!.bundleId = 'com.anthropic.claudefordesktop';
    c.onList([claude], true);
    c.onClick({ kind: 'buddy', key: claude.key });
    c.onWindow('minimize');
    c.onWindow('close');
    c.onSetting('alwaysOnTop', true);
    expect(notices).toEqual([DEMO_NOTICES.jump('com.anthropic.claudefordesktop'), DEMO_NOTICES.desktopOnly, DEMO_NOTICES.desktopOnly, DEMO_NOTICES.desktopOnly]);
    c.onSetting('macNotifications', true);
    c.onList([{ ...claude, state: 'WAITING_APPROVAL', sessions: [{ ...claude.sessions[0]!, state: 'WAITING_APPROVAL' }] }], false);
    expect(notices.at(-1)).toBe(DEMO_NOTICES.notify);
  });

  it('starts unpinned and keeps the inbox in memory only', () => {
    const { c, ports, states } = setup();
    expect(demoSettings().alwaysOnTop).toBe(false);
    const claude = buddyView('claude', '/Users/dev/webshop', [{ key: key('claude', 'c1d2…'), state: 'WORKING' }]);
    c.onList([claude], true);
    c.onList([{ ...claude, sessions: [{ ...claude.sessions[0]!, state: 'TURN_DONE' }] }], false);
    expect(ports.inbox.length).toBe(1);
    expect((states.at(-1) as { mode: string }).mode).toBe('demo');
  });
});
