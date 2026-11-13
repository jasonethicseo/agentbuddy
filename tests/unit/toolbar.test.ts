// The toolbar (retro-skin Requirement 6, B1 and B4): the roving-tabindex model, and source checks of its wiring,
// as the other UI tests do (this repo has no DOM library). The keyboard itself is tried in the screen check (task 7).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TOOLS, rovingTarget, skinFocusId, toolbarView } from '../../src/ui/model/toolbar';
const ROOT = join(import.meta.dirname, '../..');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');
describe('rovingTarget (Requirement 6.6)', () => {
  it('→ and ← move by one and wrap; Home and End go to the ends; other keys do nothing', () => {
    expect([0, 1, 2, 3].map((i) => rovingTarget('ArrowRight', i, 4))).toEqual([1, 2, 3, 0]);
    expect([0, 1, 2, 3].map((i) => rovingTarget('ArrowLeft', i, 4))).toEqual([3, 0, 1, 2]);
    expect([0, 1, 2, 3].map((i) => rovingTarget('Home', i, 4))).toEqual([0, 0, 0, 0]);
    expect([0, 1, 2, 3].map((i) => rovingTarget('End', i, 4))).toEqual([3, 3, 3, 3]);
    for (const key of ['Enter', ' ', 'Tab', 'ArrowUp', 'ArrowDown', 'a']) expect(rovingTarget(key, 1, 4)).toBeNull();
  });
});
describe('toolbarView (Requirements 6.2, 6.5)', () => {
  it('has exactly one tab stop, and aria-current only on the open screen, never on Skin', () => {
    for (const tab of ['list', 'inbox', 'settings'] as const) {
      for (const previous of [null, 'list', 'inbox', 'settings'] as const) {
        for (const roving of [0, 1, 2, 3]) {
          const v = toolbarView(tab, previous, roving);
          expect(v.tools.filter((t) => t.tabIndex === 0)).toHaveLength(1);
          expect(v.tools.filter((t) => t.current).map((t) => t.tool)).toEqual([tab]);
        }
      }
    }
  });
  it('moves the tab stop to the open screen when the screen changes, and keeps it on a re-render', () => {
    expect(toolbarView('inbox', 'list', 3).rovingIndex).toBe(1);
    expect(toolbarView('settings', null, 0).rovingIndex).toBe(2);
    expect(toolbarView('inbox', 'inbox', 3).rovingIndex).toBe(3); // the user arrowed to Skin; a list update keeps it there
  });
  it('Skin focuses the checked radio by the data-focus the Skin tiles carry', () => {
    expect(skinFocusId('strawberry-milk')).toBe('theme:strawberry-milk');
    expect(read('src/ui/screens/settings.ts')).toContain("input.dataset['focus'] = `theme:${tile.id}`;");
  });
});
describe('wiring (source checks)', () => {
  const html = read('index.html');
  const chrome = read('src/ui/chrome.ts');
  it('index.html has one toolbar of four buttons in order, and no tabs left (Requirements 6.1, 6.7)', () => {
    expect(html).toContain('<div class="toolbar" role="toolbar" aria-label="Screens">');
    const buttons = [...html.matchAll(/<button type="button" class="tool raised" data-tool="(\w+)"[^>]*>.*?<span class="tool-label">(\w+)<\/span>/g)].map((m) => [m[1], m[2]]);
    expect(buttons).toEqual([['list', 'Buddies'], ['inbox', 'Inbox'], ['settings', 'Settings'], ['skin', 'Skin']]);
    expect(buttons.map((b) => b[0])).toEqual([...TOOLS]);
    expect(html).not.toMatch(/role="tab"|role="tablist"|role="tabpanel"/);
    expect(html).toContain('<main class="screen screen-list" aria-label="Buddies">');
  });
  it('keys only move focus: the keydown handler goes through rovingTarget and opens no screen', () => {
    const handler = chrome.slice(chrome.indexOf("addEventListener('keydown'"), chrome.indexOf('});', chrome.indexOf("addEventListener('keydown'")));
    expect(handler).toContain('rovingTarget(e.key, rovingIndex, TOOLS.length)');
    expect(handler).toContain('.focus()');
    expect(handler).not.toMatch(/setTab|openSkin|click\(/);
  });
  it('Skin opens Settings with focus on the checked radio; the other three open their screen', () => {
    expect(chrome).toContain("b.addEventListener('click', () => (tool === 'skin' ? a.openSkin() : a.setTab(tool)));");
    expect(read('src/ui/main.ts')).toContain("openScreen('settings', skinFocusId(snap.settings.theme))");
  });
  it('the Inbox count reads as ", n unread" for screen readers (Requirement 6.3)', () => {
    expect(chrome).toContain("count.replaceChildren(el('span', 'sr-only', ', '), String(n), el('span', 'sr-only', ' unread'))");
  });
});
