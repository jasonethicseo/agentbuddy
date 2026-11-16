// The window around the screens as plain data: alert strip, status bar and the connections
// card (messenger-app Requirements 5.10, 5.11, 6.10, 14.1; retro-skin Requirement 8). Pure.
import type { MenuCount } from '../../core/attention';
import type { AgentId } from '../../core/event';
import type { AppSnapshot } from '../../core/snapshot';
import { AGENT_NAMES } from '../../core/text';

export type Tab = 'list' | 'inbox' | 'settings';
export type Dot = 'ok' | 'muted' | 'alert' | 'idle';

/** One sunken panel of the status bar. */
export interface StatusPanel {
  text: string;
  dot?: Dot;
  /** `on top`: the pixel check follows (Galmuri has no ✓). */
  check?: boolean;
  /** The panel that takes the free width. */
  grow?: boolean;
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
  if (s.mode === 'demo') return { dot: 'ok', text: 'demo replay' };
  switch (s.connection) {
    case 'ok':
      return { dot: 'ok', text: 'relay connected' };
    case 'foreign':
      return { dot: 'alert', text: `port ${s.port} is used by another program` };
    case 'error':
      return { dot: 'alert', text: `relay error: ${s.errorCode ?? 'unknown'}` };
    case 'disconnected':
      return s.mode === 'connecting' ? { dot: 'muted', text: 'connecting to relay…' } : { dot: 'alert', text: 'relay disconnected' };
  }
}

/**
 * The status bar, with the texts of the footer it replaces, split into panels (retro-skin Requirement 8).
 * Buddies: the relay status (or a notice for a few seconds), `local only` while connected, and `on top ✓` while pinned.
 * Inbox: the privacy line. Settings: none.
 */
export function statusPanels(s: AppSnapshot, tab: Tab, notice?: string): StatusPanel[] | null {
  if (tab === 'settings') return null;
  if (tab === 'inbox') return [{ text: 'kept on this computer only', grow: true }, { text: 'click a message to go there' }];
  const status = notice !== undefined ? { dot: 'alert' as const, text: notice } : relayStatus(s);
  const panels: StatusPanel[] = [{ dot: status.dot, text: status.text, grow: true }];
  if (notice === undefined && s.connection === 'ok') panels.push({ text: 'local only' });
  if (s.mode !== 'browser' && s.settings.alwaysOnTop) panels.push({ text: 'on top', check: true });
  return panels;
}
export function connections(s: AppSnapshot): Array<{ dot: Dot; text: string }> {
  const where = s.mode === 'own' ? ' · in this app' : s.mode === 'attached' ? ' · attached' : '';
  const relay = s.mode === 'demo' ? 'Demo: no relay, events are replayed in this page.' : `Relay · 127.0.0.1:${s.port}${where}`;
  const lines: Array<{ dot: Dot; text: string }> = [{ dot: relayStatus(s).dot, text: relay }];
  const seen = new Set<AgentId>(s.buddies.map((b) => b.agent));
  for (const agent of ['kiro', 'claude', 'codex'] as const) {
    const name = AGENT_NAMES[agent];
    if (!seen.has(agent)) lines.push({ dot: 'muted', text: `${name} · no events in 24 h` });
    else if (agent === 'codex') lines.push({ dot: 'idle', text: `${name} · finished turns only` });
    else lines.push({ dot: 'ok', text: `${name} · hooks on` });
  }
  return lines;
}
