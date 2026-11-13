// The Theme card as plain data, and how the page markup asks for it (themes Requirements 2.1–2.3).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEME_NOTE, themeTiles } from '../../src/ui/model/theme';

const ROOT = join(import.meta.dirname, '../..');

describe('themeTiles', () => {
  it('gives Strawberry Milk, then Blue Bot, with exactly the current theme checked', () => {
    expect(themeTiles('blue-bot')).toEqual([
      { id: 'strawberry-milk', name: 'Strawberry Milk', checked: false },
      { id: 'blue-bot', name: 'Blue Bot', checked: true },
    ]);
    expect(themeTiles('strawberry-milk').map((t) => t.checked)).toEqual([true, false]);
  });

  it('carries the note of the mockup', () => {
    expect(THEME_NOTE).toBe('Changes the window and the popups at once. Saved on this computer only.');
  });
});

describe('the Theme card screen', () => {
  const code = readFileSync(join(ROOT, 'src/ui/screens/settings.ts'), 'utf8');
  it('is the first card, a radio group of native radios sharing one name', () => {
    expect(code).toMatch(/wrap\.append\(themeCard\(settings\.theme, a\)\);\s*for \(const card of CARDS\)/);
    expect(code).toContain("group.setAttribute('role', 'radiogroup')");
    expect(code).toContain("input.type = 'radio'");
    expect(code).toContain("input.name = 'theme'");
  });

  it('keeps focus on the tile across the re-render that follows a change (Requirement 2.4)', () => {
    expect(code).toContain("input.dataset['focus'] = `theme:${tile.id}`");
  });

  it('shows each mini window in its own theme, hidden from screen readers', () => {
    expect(code).toContain("mini.dataset['themePreview'] = tile.id");
    expect(code).toContain("mini.setAttribute('aria-hidden', 'true')");
  });
});
