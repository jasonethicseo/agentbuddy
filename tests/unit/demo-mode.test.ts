// The demo page's snapshot mode (submission Requirement 1.5, design "Snapshot mode") and the pure settings
// module the demo bundles (design "Settings split").
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as data from '../../src/app/settings-data';
import * as settings from '../../src/app/settings';
import { bannerView } from '../../src/ui/model/banner';
import { connections, relayStatus, statusPanels } from '../../src/ui/model/chrome';
import { meView } from '../../src/ui/model/me';
import { snapshot } from '../fixtures/views';

describe('demo mode', () => {
  const demo = snapshot([], { mode: 'demo', connection: 'ok' }, { alwaysOnTop: false });

  it('says demo replay where the app shows the relay, and no relay address', () => {
    expect(relayStatus(demo)).toEqual({ dot: 'ok', text: 'demo replay' });
    expect(statusPanels(demo, 'list')).toEqual([{ dot: 'ok', text: 'demo replay', grow: true }, { text: 'local only' }]);
    expect(connections(demo)[0]).toEqual({ dot: 'ok', text: 'Demo: no relay, events are replayed in this page.' });
    expect(connections(demo).map((l) => l.text).join(' ')).not.toContain('127.0.0.1');
  });

  it('keeps the app-only parts that the relay page leaves out: the me row and the TIP banner', () => {
    expect(meView(demo, 'list')).not.toBeNull();
    expect(meView(snapshot([], { mode: 'browser' }), 'list')).toBeNull();
    expect(bannerView(demo, 'list', 'click-buddy')).not.toBeNull();
    expect(bannerView(snapshot([], { mode: 'browser' }), 'list', 'click-buddy')).toBeNull();
  });
});

describe('settings split', () => {
  it('settings-data.ts imports no Node built-in, so a browser can bundle it', () => {
    const source = readFileSync(new URL('../../src/app/settings-data.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/from '(node:|fs|path)/);
  });

  it('settings.ts still exports the same pure parts', () => {
    expect(settings.parseSettings).toBe(data.parseSettings);
    expect(settings.serializeSettings).toBe(data.serializeSettings);
    expect(settings.DEFAULT_SETTINGS).toBe(data.DEFAULT_SETTINGS);
    expect(settings.MAX_CLOSED_GROUPS).toBe(data.MAX_CLOSED_GROUPS);
  });
});
