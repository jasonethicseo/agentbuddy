// The window around the screens as plain data: alert strip, footer and the connections
// card (messenger-app Requirements 5.10, 5.11, 6.10, 14.1). Pure.
import type { MenuCount } from '../../core/attention';
import type { AgentId } from '../../core/event';
import type { AppSnapshot } from '../../core/snapshot';
import { AGENT_NAMES } from '../../core/text';

export type Tab = 'list' | 'inbox' | 'settings';
export type Dot = 'ok' | 'muted' | 'alert' | 'idle';

export interface FooterVM {
  dot?: Dot;
  left: string;
  right?: string;
}

/** `1 needs your OK · 1 done, unread`, or null when nothing needs the user. */
export function alertText(c: MenuCount): string | null {
  const parts: string[] = [];
  if (c.waiting > 0) parts.push(`${c.waiting} ${c.waiting === 1 ? 'needs' : 'need'} your OK`);
  if (c.unreadTurns > 0) parts.push(`${c.unreadTurns} done, unread`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** The relay connection as a dot and a line. */
export function relayStatus(s: AppSnapshot): { dot: Dot; text: string } {
  switch (s.connection) {
    case 'ok':
      return { dot: 'ok', text: 'relay connected · local only' };
    case 'foreign':
      return { dot: 'alert', text: `port ${s.port} is used by another program` };
    case 'error':
      return { dot: 'alert', text: `relay error: ${s.errorCode ?? 'unknown'}` };
    case 'disconnected':
      return s.mode === 'connecting' ? { dot: 'muted', text: 'connecting to relay…' } : { dot: 'alert', text: 'relay disconnected' };
  }
}

/**
 * Buddies: the relay status (or a notice for a few seconds) and `on top ✓` while pinned.
 * Inbox: the privacy line. Settings: no footer.
 */
export function footer(s: AppSnapshot, tab: Tab, notice?: string): FooterVM | null {
  if (tab === 'settings') return null;
  if (tab === 'inbox') return { left: 'kept on this computer only', right: 'click a message to go there' };
  const status = notice !== undefined ? { dot: 'alert' as const, text: notice } : relayStatus(s);
  const vm: FooterVM = { dot: status.dot, left: status.text };
  if (s.mode !== 'browser' && s.settings.alwaysOnTop) vm.right = 'on top ✓';
  return vm;
}

export function connections(s: AppSnapshot): Array<{ dot: Dot; text: string }> {
  const where = s.mode === 'own' ? ' · in this app' : s.mode === 'attached' ? ' · attached' : '';
  const lines: Array<{ dot: Dot; text: string }> = [{ dot: relayStatus(s).dot, text: `Relay · 127.0.0.1:${s.port}${where}` }];
  const seen = new Set<AgentId>(s.buddies.map((b) => b.agent));
  for (const agent of ['kiro', 'claude', 'codex'] as const) {
    const name = AGENT_NAMES[agent];
    if (!seen.has(agent)) lines.push({ dot: 'muted', text: `${name} · no events in 24 h` });
    else if (agent === 'codex') lines.push({ dot: 'idle', text: `${name} · finished turns only` });
    else lines.push({ dot: 'ok', text: `${name} · hooks on` });
  }
  return lines;
}
