// The Buddies screen in the retro skin (retro-skin Requirements 4.6, 4.7, 7.2–7.7): source checks, as the other UI
// tests do (no DOM library in this repo). What the rows hold and do is covered by ui-model.test.ts and is unchanged.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
const ROOT = join(import.meta.dirname, '../..');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');
const list = read('src/ui/screens/list.ts');
const css = read('src/ui/styles/list.css');
const main = read('src/ui/main.ts');
describe('group heads (Requirement 7.4)', () => {
  it('show a pixel box, the folder name and (online/total), with online for screen readers', () => {
    expect(list).toContain("caret.append(icon(g.open ? 'box-open' : 'box-closed', 9));");
    expect(list).toContain("g.kind === 'folder' ? `(${g.online}/${g.total})` : `(${g.total})`");
    expect(list).toContain("if (g.kind === 'folder') count.append(el('span', 'sr-only', ' online'));");
    expect(list).not.toMatch(/'▼'|'▶'/);
  });
});
describe('unread marker (Requirements 4.6, 4.7)', () => {
  it('is the N tag with unread for screen readers in Blue Bot, and a strawberry image named new in Strawberry Milk', () => {
    expect(list).toContain("m.setAttribute('role', 'img');\n    m.setAttribute('aria-label', 'new');\n    m.append(icon('berry', 12));");
    expect(list).toContain("return [m, el('span', 'sr-only', 'unread')];");
  });
});
describe('selection (Requirement 7.6)', () => {
  it('is the focused buddy row, else the one clicked last while no buddy row has focus; white text, framed marker', () => {
    expect(css).toContain('.buddy-main:focus-visible,\n.screen-list:not(:has(.buddy-main:focus-visible)) .buddy-main[data-selected] {\n  color: var(--selection-text); background: var(--selection);\n}');
    expect(css).toMatch(/\.unread-mark \{\n  outline: 1px solid var\(--unread-select-line\);\n\}/);
    expect(css).toMatch(/:is\(\.buddy-count, \.buddy-phrase, \.buddy-excerpt, \.buddy-age\) \{\n  color: inherit;\n\}/);
  });
  it('a buddy click marks the row and still acknowledges and jumps; the mark is not stored and ends with its buddy', () => {
    const click = main.slice(main.indexOf('click: (kind, key) => {'), main.indexOf('hide: (session)'));
    expect(click).toContain('selected = key;');
    expect(click).toContain('bridge?.click(kind, key);');
    expect(main).toContain('if (selected !== null && !groups.some((g) => g.buddies.some((b) => b.key === selected))) selected = null;');
    expect(main).not.toMatch(/setSetting\([^)]*selected/);
  });
});
describe('me row and rows (Requirements 7.2, 7.5, 7.7)', () => {
  it('the me sprite sits in a sunken frame, (online) follows me, the pencil is a pixel icon', () => {
    const me = read('src/ui/screens/me.ts');
    expect(me).toContain("el('span', 'me-frame sunken')");
    expect(me).toContain("name.append(' ', el('span', 'me-online', '(online)'));");
    expect(me).toContain("pencil.append(icon('pencil', 7));");
    expect(me).not.toContain('✎');
  });
  it('the list is one sunken white panel; ▸ is set in regular weight; progress sits in a sunken-colored track', () => {
    expect(read('index.html')).toContain('<main class="screen screen-list sunken" aria-label="Buddies">');
    expect(css).toContain('.lead-work::before { content: var(--glyph-work) " "; font-weight: 400; }');
    expect(css).toContain('.cell { height: 7px; background: var(--prog-todo); }');
  });
});
describe('inbox (Requirement 12.1)', () => {
  it('rows sit in a sunken panel, Mark all read is raised, the unread marker is the skin one', () => {
    const inbox = read('src/ui/screens/inbox.ts');
    expect(inbox).toContain("el('div', 'inbox-list sunken')");
    expect(inbox).toContain("button('mark-all raised', 'Mark all read', () => a.ackAll(), 'mark-all')");
    expect(inbox).toContain('if (r.unread) side.append(...unreadMark(theme));');
    expect(inbox).toContain('const row = button(\'inbox-row\', \'\', () => a.click(r.session), `i:${i}:${r.session}`);');
  });
});
describe('layout fix F2 (two scrollbars after opening the offline group)', () => {
  const mainCss = read('src/ui/styles/main.css');
  it('the window and the screens hold the absolutely placed screen-reader texts, so the page never scrolls', () => {
    expect(mainCss).toMatch(/\.window \{\n  position: relative;/);
    expect(mainCss).toContain('.screen { position: relative; flex: 1 1 auto; min-height: 0; overflow-x: hidden; overflow-y: auto; }');
  });
  it('screens clip what does not fit instead of scrolling sideways', () => {
    expect(mainCss).toContain('overflow-x: hidden; overflow-y: auto;');
  });
});
describe('two-line buddy rows (layout change from real use, 2026-11-13)', () => {
  const rule = (sel: string) => css.match(new RegExp(`(^|\\n)${sel.replace(/[.]/g, '\\.')} \\{([^}]*)\\}`))?.[2] ?? '';
  it('the name and [n] never shrink; only the phrase is cut', () => {
    for (const sel of ['.buddy-name', '.buddy-count']) {
      expect([sel, rule(sel)]).toEqual([sel, expect.stringContaining('flex-shrink: 0;')]);
      expect(rule(sel)).not.toMatch(/text-overflow|overflow: hidden|min-width: 0/);
    }
    expect(rule('.buddy-phrase')).toMatch(/flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis;/);
    expect(rule('.buddy-end')).toContain('flex-shrink: 0;');
  });
  it('line 2 is the excerpt at full width in 12 px text-2, only when there is one; the sprite spans both lines', () => {
    expect(rule('.buddy-excerpt')).toMatch(/grid-column: 2;/);
    expect(rule('.buddy-excerpt')).toContain('color: var(--text-2);');
    expect(rule('.buddy-excerpt')).not.toContain('font-small');
    expect(list).toContain("if (vm.parts.excerpt !== undefined) main.append(el('span', 'buddy-excerpt', vm.parts.excerpt));");
    expect(css).toContain('.buddy-main[data-lines="2"] > .sprite { grid-row: 1 / span 2; }');
  });
  it('line 1 holds name, [n], phrase, then age and the unread marker at the right; progress is line 3', () => {
    const block = list.slice(list.indexOf('function buddyBlock'), list.indexOf('function groupHead'));
    const order = ["'buddy-name'", "'buddy-count'", "'buddy-phrase'", "'buddy-age'", 'unreadMark(theme)', "'buddy-excerpt'", 'progressBlock(vm.progress)'].map((t) => block.indexOf(t));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
  it('the tooltip is the excerpt (and the Codex note), never while hide-text is on', () => {
    expect(list).toContain("const tip = [vm.tooltip, vm.hover].filter((t) => t !== undefined).join('\\n');");
    expect(read('src/ui/model/list.ts')).toContain('if (vm.parts.excerpt !== undefined && !hideText) vm.tooltip = vm.parts.excerpt;');
  });
});
