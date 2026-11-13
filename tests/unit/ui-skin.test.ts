// The Skin group as plain data, and how the Settings screen asks for it (themes Requirements 2.1–2.4;
// retro-skin Requirements 1, 10.4, 12.2, 12.3).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BANNER_NOTE, SKIN_NOTE, skinTiles } from '../../src/ui/model/skin';
const ROOT = join(import.meta.dirname, '../..');
describe('skinTiles', () => {
  it('gives Blue Bot, then Strawberry Milk (SkinPicker2000), with exactly the current skin checked', () => {
    expect(skinTiles('blue-bot')).toEqual([
      { id: 'blue-bot', name: 'Blue Bot', checked: true },
      { id: 'strawberry-milk', name: 'Strawberry Milk', checked: false },
    ]);
    expect(skinTiles('strawberry-milk').map((t) => t.checked)).toEqual([false, true]);
  });
  it('carries the notes of the mockup', () => {
    expect(SKIN_NOTE).toBe('Changes the window and the popups at once. Saved on this computer only.');
    expect(BANNER_NOTE).toBe('Tips are built in. Nothing is downloaded.');
  });
});
describe('the Settings screen', () => {
  const code = readFileSync(join(ROOT, 'src/ui/screens/settings.ts'), 'utf8');
  it('is group boxes in the order Skin, Banner, Window, When an agent needs you, Privacy, Connections (Requirement 12.2)', () => {
    expect(code).toMatch(/wrap\.append\(skinGroup\(settings\.theme, a\)\);\s*for \(const g of GROUPS\)/);
    const titles = [...code.matchAll(/\btitle: '([^']+)'/g)].map((m) => m[1]);
    expect(titles).toEqual(['Banner', 'Window', 'When an agent needs you', 'Privacy']);
    expect(code).toContain("const conn = group('Connections', 'set-conn');");
    expect(code).toContain("const set = el('fieldset'");
    expect(code).toContain("set.append(el('legend', undefined, title));");
  });
  it('the Skin group is a radio group named Skin of native radios sharing one name (Requirement 12.3)', () => {
    expect(code).toContain("const set = group('Skin', 'set-skin');");
    expect(code).toContain("tiles.setAttribute('role', 'radiogroup')");
    expect(code).toContain("tiles.setAttribute('aria-labelledby', 'skin-title')");
    expect(code).toContain("input.type = 'radio'");
    expect(code).toContain("input.name = 'skin'");
    expect(code).toContain("if (tile.checked) label.dataset['pressed'] = '';");
    expect(code).not.toContain('✓');
  });
  it('keeps focus on the tile across the re-render that follows a change (themes Requirement 2.4)', () => {
    expect(code).toContain("input.dataset['focus'] = `theme:${tile.id}`");
  });
  it('shows each mini window in its own skin, hidden from screen readers', () => {
    expect(code).toContain("mini.dataset['themePreview'] = tile.id");
    expect(code).toContain("mini.setAttribute('aria-hidden', 'true')");
  });
  it('has the Banner switch with its note (Requirement 10.4)', () => {
    expect(code).toContain("{ title: 'Banner', rows: [['hideBanner', 'Hide the TIP banner']], note: BANNER_NOTE }");
  });
});
