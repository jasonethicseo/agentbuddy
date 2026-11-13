// The Inbox tab: today's pings, newest first (messenger-app Requirements 10.2, 11.3, 11.6;
// themes Requirements 6.4, 7.7: 26 px sprites with badges and the theme's unread marker).
import type { ThemeId } from '../../core/theme';
import { button, el } from '../dom';
import type { InboxRowVM } from '../model/inbox';
import { STATE_NAMES, stateSprite } from '../sprites/render';

export function renderInbox(
  root: HTMLElement,
  theme: ThemeId,
  header: string,
  rows: readonly InboxRowVM[],
  a: { click(session: string): void; ackAll(): void },
): void {
  const head = el('div', 'inbox-head');
  head.append(el('span', 'inbox-title', header), button('mark-all', 'Mark all read', () => a.ackAll(), 'mark-all'));
  const list = el('div', 'inbox-list');
  rows.forEach((r, i) => {
    const row = button('inbox-row', '', () => a.click(r.session), `i:${i}:${r.session}`);
    row.dataset['state'] = r.state;
    if (r.unread) row.dataset['unread'] = '';
    const who = el('span', 'inbox-who');
    who.append(el('b', 'inbox-agent', r.agent));
    if (r.folder !== '') who.append(' ', el('span', 'inbox-at', `@ ${r.folder}`));
    const text = el('span', 'inbox-text');
    text.append(who, el('span', 'inbox-line', r.line));
    const side = el('span', 'inbox-side');
    side.append(el('span', 'inbox-time', r.time));
    if (r.unread) {
      const mark = el('span', 'unread-mark');
      mark.setAttribute('aria-hidden', 'true');
      side.append(mark, el('span', 'sr-only', 'unread'));
    }
    // A key of another form names no agent: no sprite, but the state is still given as text.
    const icon = r.agentId !== undefined ? stateSprite(theme, r.agentId, r.state, 24) : [el('span', 'sr-only', STATE_NAMES[r.state])];
    row.append(...icon, text, side);
    list.append(row);
  });
  if (rows.length === 0) list.append(el('p', 'empty', 'No messages today'));
  root.replaceChildren(head, list);
}
