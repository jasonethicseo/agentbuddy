// The Settings tab: four cards of switches and the connections card (messenger-app Requirements 4.8, 14.1).
import type { PublicSettings, SettingKey } from '../../core/snapshot';
import { el } from '../dom';
import type { Dot } from '../model/chrome';

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
  a: { setSetting(key: SettingKey, value: boolean): void },
): void {
  const wrap = el('div', 'settings');
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
    const dot = el('span', 'dot');
    dot.dataset['dot'] = l.dot;
    dot.setAttribute('aria-hidden', 'true');
    line.append(dot, l.text);
    conn.append(line);
  }
  wrap.append(conn);
  root.replaceChildren(wrap);
}
