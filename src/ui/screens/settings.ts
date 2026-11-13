// The Settings screen: the Skin group first, then Banner, the switch groups and Connections
// (messenger-app Requirements 4.8, 14.1; themes Requirements 2.1–2.4; retro-skin Requirements 1, 10.4, 12.2, 12.3).
import type { PublicSettings, SettingKey } from '../../core/snapshot';
import type { ThemeId } from '../../core/theme';
import { el } from '../dom';
import type { Dot } from '../model/chrome';
import { BANNER_NOTE, SKIN_NOTE, skinTiles } from '../model/skin';
import { sprite } from '../sprites/render';
export interface SettingsActions {
  setSetting(key: SettingKey, value: boolean): void;
  setTheme(theme: ThemeId): void;
}
/** A `<fieldset>` with its `<legend>` (retro-skin Requirement 12.2). */
function group(title: string, cls?: string): HTMLFieldSetElement {
  const set = el('fieldset', cls === undefined ? 'set-group' : `set-group ${cls}`);
  set.append(el('legend', undefined, title));
  return set;
}
/**
 * Native radios with one name: Tab reaches the checked one, the arrow keys move and select,
 * Space selects (themes Requirement 2.3). Each tile's mini window takes its own skin's tokens.
 */
function skinGroup(current: ThemeId, a: SettingsActions): HTMLElement {
  const set = group('Skin', 'set-skin');
  const legend = set.querySelector('legend')!;
  legend.id = 'skin-title';
  const tiles = el('div', 'skin-tiles');
  tiles.setAttribute('role', 'radiogroup');
  tiles.setAttribute('aria-labelledby', 'skin-title');
  for (const tile of skinTiles(current)) {
    const label = el('label', 'skin-tile raised');
    if (tile.checked) label.dataset['pressed'] = '';
    const mini = el('span', 'skin-mini');
    mini.dataset['themePreview'] = tile.id;
    mini.setAttribute('aria-hidden', 'true');
    const row = el('span', 'skin-mini-row sunken');
    row.append(sprite(tile.id, 'claude', 'WORKING', 16), el('span', 'skin-mini-bar'));
    mini.append(el('span', 'skin-mini-title'), row);
    const input = el('input', 'skin-input');
    input.type = 'radio';
    input.name = 'skin';
    input.value = tile.id;
    input.checked = tile.checked;
    input.dataset['focus'] = `theme:${tile.id}`;
    input.addEventListener('change', () => {
      if (input.checked) a.setTheme(tile.id);
    });
    const name = el('span', 'skin-choice');
    name.append(input, el('span', 'skin-name', tile.name));
    label.append(mini, name);
    tiles.append(label);
  }
  set.append(tiles, el('p', 'set-note', SKIN_NOTE));
  return set;
}
const GROUPS: ReadonlyArray<{ title: string; rows: ReadonlyArray<[SettingKey, string]>; note?: string }> = [
  { title: 'Banner', rows: [['hideBanner', 'Hide the TIP banner']], note: BANNER_NOTE },
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
  wrap.append(skinGroup(settings.theme, a));
  for (const g of GROUPS) {
    const set = group(g.title);
    for (const [key, label] of g.rows) {
      const row = el('label', 'check');
      const box = el('input');
      box.type = 'checkbox';
      box.checked = settings[key];
      box.dataset['focus'] = `set:${key}`;
      box.addEventListener('change', () => a.setSetting(key, box.checked));
      row.append(box, el('span', undefined, label));
      set.append(row);
    }
    if (g.note !== undefined) set.append(el('p', 'set-note', g.note));
    wrap.append(set);
  }
  const conn = group('Connections', 'set-conn');
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
