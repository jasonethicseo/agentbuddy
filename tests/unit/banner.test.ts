// The TIP banner's view and wiring (retro-skin Requirement 9): where it shows, what it says and does, and that
// a click reaches nothing but screen changes. Source checks for the DOM side, as the other UI tests do.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { InboxEntry } from '../../src/core/attention';
import { bannerView, tipContext } from '../../src/ui/model/banner';
import { snapshot } from '../fixtures/views';
const ROOT = join(import.meta.dirname, '../..');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');
const unread = (n: number): InboxEntry[] =>
  Array.from({ length: n }, (_, i) => ({ at: `2026-11-13T00:0${i}:00.000Z`, session: `s${i}`, buddyName: 'Codex @ demo', startedAt: '2026-11-13T00:00:00.000Z', state: 'TURN_DONE', acked: false }) as InboxEntry);
describe('bannerView (Requirement 9.9)', () => {
  it('shows on the Buddies screen of the app only, and not while hideBanner is on', () => {
    const s = snapshot([]);
    expect(bannerView(s, 'list', 'click-buddy')).not.toBeNull();
    expect(bannerView(s, 'inbox', 'click-buddy')).toBeNull();
    expect(bannerView(s, 'settings', 'click-buddy')).toBeNull();
    expect(bannerView(snapshot([], { mode: 'browser' }), 'list', 'click-buddy')).toBeNull();
    expect(bannerView(snapshot([], {}, { hideBanner: true }), 'list', 'click-buddy')).toBeNull();
    expect(bannerView(s, 'list', null)).toBeNull();
  });
  it('carries the tip text, the strawberry flag and the action', () => {
    const pink = snapshot([], { inbox: unread(1) }, { theme: 'strawberry-milk' });
    expect(bannerView(pink, 'list', 'skin-blue-bot')).toEqual({ id: 'skin-blue-bot', headline: '★ NEW! Blue Bot skin ★', body: 'try it now~ click here', berry: true, action: 'skin' });
    expect(bannerView(pink, 'list', 'unread')).toMatchObject({ headline: '1 unread message waiting!', action: 'inbox' });
    expect(bannerView(pink, 'list', 'sound')).toMatchObject({ action: 'sound' });
    expect(bannerView(pink, 'list', 'click-buddy')).toMatchObject({ headline: 'TIP ▶ click a buddy', action: 'next' });
  });
  it('reads the skin, the sound switch and the Inbox count', () => {
    expect(tipContext(snapshot([], { inbox: unread(2) }, { sound: false, theme: 'strawberry-milk' }))).toEqual({ theme: 'strawberry-milk', sound: false, unread: 2 });
  });
});
describe('wiring (Requirements 9.3–9.6, 9.10, 9.11)', () => {
  const main = read('src/ui/main.ts');
  const screen = read('src/ui/screens/banner.ts');
  it('the banner is a button running the action and ▶ is a button named Next tip; text goes in with textContent only', () => {
    expect(screen).toContain("button('banner-main', '', () => a.run(vm), 'banner:main')");
    expect(screen).toContain("next.setAttribute('aria-label', 'Next tip');");
    expect(screen).not.toMatch(/innerHTML|insertAdjacentHTML|bridge/);
  });
  it('a click only changes the screen or the tip; nothing goes to the bridge', () => {
    const handlers = main.slice(main.indexOf('function showNextTip'), main.indexOf('setupChrome('));
    expect(handlers).not.toContain('bridge');
    expect(handlers).toContain("if (vm.action === 'skin') openSkin();");
    expect(handlers).toContain("else if (vm.action === 'sound') openScreen('settings', 'set:sound');");
    expect(handlers).toContain("else if (vm.action === 'inbox') openScreen('inbox');");
    expect(handlers).toContain('tip = nextTip(tip, tipContext(snap));');
  });
  it('the tip starts from the local date on the first app snapshot and is kept after; no timer changes it', () => {
    expect(main).toContain('startTip(dayNumber(now.getFullYear(), now.getMonth() + 1, now.getDate()), tipContext(s))');
    expect(main).toContain(': keepTip(tip, tipContext(s));');
    expect(main.match(/nextTip\(/g)).toHaveLength(1); // only in showNextTip
    expect(main.match(/setInterval\([^)]*\)/g)).toEqual(['setInterval(render, AGE_TICK_MS)']);
  });
});
