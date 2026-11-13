// The Settings tab: the Theme card first, then the switch cards and the connections card
// (messenger-app Requirements 4.8, 14.1; themes Requirements 2.1–2.4, 7.7).
import type { PublicSettings, SettingKey } from '../../core/snapshot';
import type { ThemeId } from '../../core/theme';
import { el } from '../dom';
import type { Dot } from '../model/chrome';
import { THEME_NOTE, themeTiles } from '../model/theme';
import { sprite } from '../sprites/render';

export interface SettingsActions {
  setSetting(key: SettingKey, value: boolean): void;
  setTheme(theme: ThemeId): void;
}

/**
 * Native radios with one name: Tab reaches the checked one, the arrow keys move and select,
 * Space selects (Requirement 2.3). Each tile's mini window takes its own theme's tokens.
 */
function themeCard(current: ThemeId, a: SettingsActions): HTMLElement {
  const section = el('section', 'set-card set-theme');
  const title = el('h2', 'set-title', 'Theme');
  title.id = 'theme-title';
  const group = el('div', 'theme-tiles');
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-labelledby', 'theme-title');
  for (const tile of themeTiles(current)) {
    const label = el('label', 'theme-tile');
    if (tile.checked) label.dataset['checked'] = '';
    const input = el('input', 'theme-input');
    input.type = 'radio';
    input.name = 'theme';
    input.value = tile.id;
    input.checked = tile.checked;
    input.dataset['focus'] = `theme:${tile.id}`;
    input.addEventListener('change', () => {
      if (input.checked) a.setTheme(tile.id);
    });
    const mini = el('span', 'theme-mini');
    mini.dataset['themePreview'] = tile.id;
    mini.setAttribute('aria-hidden', 'true');
    const row = el('span', 'theme-mini-row');
    row.append(sprite(tile.id, 'claude', 'WORKING', 16), el('span', 'theme-mini-bar'));
    mini.append(el('span', 'theme-mini-title'), row);
    const check = el('span', 'theme-check', ' ✓');
    check.setAttribute('aria-hidden', 'true');
    const name = el('span', 'theme-name', tile.name);
    name.append(check);
    label.append(input, mini, name);
    group.append(label);
  }
  section.append(title, group, el('p', 'set-note', THEME_NOTE));
  return section;
}

const CARDS: ReadonlyArray<{ title: string; rows: ReadonlyArray<[SettingKey, string]>; note?: string }> = [
  { title: 'Window', rows: [['alwaysOnTop', 'Always on top']] },
  {
    title: 'When an agent needs you',
    rows: [
      ['sound', 'Ding! sound'],
      ['popups', 'Message popup'],
      ['macNotifications', 'macOS notification too'],
    ],
  },
  { title: 'Privacy', rows: [['hideText', 'Hide prompt and reply text']], note: 'Everything stays on this computer.' },
];

export function renderSettings(
  root: HTMLElement,
  settings: PublicSettings,
  lines: ReadonlyArray<{ dot: Dot; text: string }>,
  a: SettingsActions,
): void {
  const wrap = el('div', 'settings');
  wrap.append(themeCard(settings.theme, a));
  for (const card of CARDS) {
    const section = el('section', 'set-card');
    section.append(el('h2', 'set-title', card.title));
    for (const [key, label] of card.rows) {
      const row = el('label', 'check');
      const box = el('input');
      box.type = 'checkbox';
      box.checked = settings[key];
      box.dataset['focus'] = `set:${key}`;
      box.addEventListener('change', () => a.setSetting(key, box.checked));
      row.append(el('span', undefined, label), box);
      section.append(row);
    }
    if (card.note !== undefined) section.append(el('p', 'set-note', card.note));
    wrap.append(section);
  }
  const conn = el('section', 'set-card set-conn');
  conn.append(el('h2', 'set-title', 'Connections'));
  for (const l of lines) {
    const line = el('span', 'conn');
    const dot = el('span', 'relay-mark');
    dot.dataset['dot'] = l.dot;
    dot.setAttribute('aria-hidden', 'true');
    line.append(dot, l.text);
    conn.append(line);
  }
  wrap.append(conn);
  root.replaceChildren(wrap);
}
