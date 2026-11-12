// App plain modules: IPC checks, window options, pop-up layout and the menu bar icon
// (messenger-app Requirements 5.1, 5.8, 9.1–9.3, 9.6, 15.1–15.3, 17.1).
import { describe, expect, it } from 'vitest';
import { MAIN, POPUP } from '../../src/app/config';
import { BUBBLE, bubbleBitmap } from '../../src/app/icon';
import { POPUP_CHECKS, UI_CHECKS } from '../../src/app/ipc';
import { placePopups, popupCapacity } from '../../src/app/popup-layout';
import { SECURE_PREFERENCES, mainWindowOptions, mainWindowPosition, popupWindowOptions } from '../../src/app/window-options';

const hostile = Object.defineProperty({}, 'kind', { get: () => { throw new Error('boom'); }, enumerable: true });

describe('IPC checks', () => {
  it('accept well-formed messages', () => {
    expect(UI_CHECKS['ui:ready'](undefined)).toBe(true);
    expect(UI_CHECKS['ui:ackAll'](undefined)).toBe(true);
    expect(UI_CHECKS['ui:click']({ kind: 'session', key: '["claude","e697…"]' })).toEqual({ kind: 'session', key: '["claude","e697…"]' });
    expect(UI_CHECKS['ui:hide']({ session: '["kiro","sess_ce19…"]' })).toEqual({ session: '["kiro","sess_ce19…"]' });
    expect(UI_CHECKS['ui:setting']({ key: 'hideText', value: true })).toEqual({ key: 'hideText', value: true });
    expect(UI_CHECKS['ui:group']({ folder: '/Users/dev/demo', open: false })).toEqual({ folder: '/Users/dev/demo', open: false });
    expect(UI_CHECKS['ui:window']({ action: 'minimize' })).toEqual({ action: 'minimize' });
    for (const action of ['go', 'close', 'later']) expect(POPUP_CHECKS['popup:click']({ action })).toEqual({ action });
  });

  it('drop extra fields', () => {
    expect(UI_CHECKS['ui:click']({ kind: 'buddy', key: 'k', bundleId: 'com.x.y', folder: '/etc' })).toEqual({ kind: 'buddy', key: 'k' });
  });

  it.each([
    ['ui:ready', { a: 1 }],
    ['ui:ackAll', 'all'],
    ['ui:click', { kind: 'popup', key: 'k' }],
    ['ui:click', { kind: 'session', key: '' }],
    ['ui:click', { kind: 'session', key: 'x'.repeat(1025) }],
    ['ui:click', { kind: 'session', key: 7 }],
    ['ui:click', ['session', 'k']],
    ['ui:click', null],
    ['ui:click', hostile],
    ['ui:click', Object.create({ kind: 'session', key: 'k' })],
    ['ui:hide', { session: ['k'] }],
    ['ui:setting', { key: 'closedGroups', value: true }],
    ['ui:setting', { key: '__proto__', value: true }],
    ['ui:setting', { key: 'sound', value: 'yes' }],
    ['ui:group', { folder: '/Users/dev/demo', open: 1 }],
    ['ui:window', { action: 'quit' }],
  ] as const)('reject a bad %s message', (channel, payload) => {
    expect(UI_CHECKS[channel](payload)).toBeNull();
  });

  it('reject a bad popup:click message', () => {
    for (const bad of [undefined, {}, { action: 'jump' }, { action: 'go', extra: 1 }.action === 'go' ? { action: 'GO' } : {}]) {
      expect(POPUP_CHECKS['popup:click'](bad)).toBeNull();
    }
  });
});

describe('window options', () => {
  const main = mainWindowOptions({ preload: '/p/main.cjs', x: 1, y: 2, alwaysOnTop: true });
  const popup = popupWindowOptions({ preload: '/p/popup.cjs', x: 3, y: 4 });

  it.each([
    ['main window', main],
    ['pop-up', popup],
  ])('the %s has contextIsolation and sandbox on, Node off, and its own preload', (_name, o) => {
    expect(o.webPreferences).toMatchObject(SECURE_PREFERENCES);
    expect(o.webPreferences).toMatchObject({ contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false, webviewTag: false });
    expect(o.webPreferences?.preload).toMatch(/^\/p\/(main|popup)\.cjs$/);
    expect(o.show).toBe(false);
  });

  it('the main window is frameless, 320 px wide, at least 420 px high, and keeps running while hidden', () => {
    expect(main).toMatchObject({ frame: false, width: 320, minWidth: 320, maxWidth: 320, minHeight: 420, resizable: true, alwaysOnTop: true, x: 1, y: 2 });
    expect(main).not.toHaveProperty('transparent');
    expect(main.webPreferences?.backgroundThrottling).toBe(false);
    expect(mainWindowOptions({ preload: '/p', x: 0, y: 0, alwaysOnTop: false }).alwaysOnTop).toBe(false);
  });

  it('the pop-up is a non-activating panel that never takes focus but gets its first click', () => {
    expect(popup).toMatchObject({ type: 'panel', focusable: false, acceptFirstMouse: true, frame: false, alwaysOnTop: true, movable: false, resizable: false });
    expect(popup).toMatchObject({ width: POPUP.width, height: POPUP.height, x: 3, y: 4 });
  });

  it('places the main window at the top-right of the visible area', () => {
    expect(mainWindowPosition({ x: 0, y: 25, width: 1512, height: 920 })).toEqual({ x: 1512 - MAIN.width - 12, y: 37 });
  });
});

describe('pop-up layout', () => {
  const area = { x: 0, y: 25, width: 1512, height: 920 };
  it('stacks upward from the bottom-right corner with a 10 px gap', () => {
    expect(placePopups(3, area, POPUP, POPUP.gap, POPUP.margin)).toEqual([
      { x: 1512 - 12 - 300, y: 25 + 920 - 12 - 136 },
      { x: 1512 - 12 - 300, y: 25 + 920 - 12 - 136 - 146 },
      { x: 1512 - 12 - 300, y: 25 + 920 - 12 - 136 - 292 },
    ]);
  });

  it('places no more than fit, so the oldest must close first', () => {
    expect(popupCapacity(area, POPUP, POPUP.gap, POPUP.margin)).toBe(6); // (920 - 24 + 10) / 146
    expect(placePopups(9, area, POPUP, POPUP.gap, POPUP.margin)).toHaveLength(6);
    expect(popupCapacity({ x: 0, y: 0, width: 200, height: 900 }, POPUP, 10, 12)).toBe(0);
  });
});

describe('menu bar icon', () => {
  it('is the bubble of design.md: a 14 × 10 block, a 3 × 3 tail, two 2 × 2 eyes cut out', () => {
    expect(BUBBLE).toHaveLength(16);
    expect(BUBBLE.join('').split('').filter((c) => c === '#')).toHaveLength(14 * 10 + 3 * 3 - 2 * 4);
    expect(BUBBLE[2]).toBe('.##############.');
    expect(BUBBLE[6]).toBe('.####..##..####.');
    expect(BUBBLE[14]).toBe('...###..........');
    expect(BUBBLE[15]).toBe('................');
  });

  it('turns into RGBA pixels at 16 and 32 px, black and opaque only where filled', () => {
    for (const scale of [1, 2] as const) {
      const b = bubbleBitmap(scale);
      expect([b.width, b.height, b.data.length]).toEqual([16 * scale, 16 * scale, 16 * scale * 16 * scale * 4]);
      const opaque = [...b.data].filter((v, i) => i % 4 === 3 && v === 255).length;
      expect(opaque).toBe(141 * scale * scale);
      expect([...b.data].filter((v, i) => i % 4 !== 3 && v !== 0)).toEqual([]);
    }
  });
});
