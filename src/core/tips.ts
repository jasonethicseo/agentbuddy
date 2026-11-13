// The TIP banner's built-in tips and how one is chosen (retro-skin Requirement 9; design "Core").
// Pure: no file system, network, timers or clock. The caller passes the local calendar date.
import type { ThemeId } from './theme';
export const TIP_IDS = ['skin-blue-bot', 'skin-strawberry-milk', 'click-buddy', 'sound', 'unread', 'hide-sessions'] as const;
export type TipId = (typeof TIP_IDS)[number];
/** What a click on the banner does: open a place, or show the next tip. */
export type TipAction = 'skin' | 'sound' | 'inbox' | 'next';
/** Everything a tip's condition depends on. `unread` is the Inbox count. */
export interface TipContext {
  theme: ThemeId;
  sound: boolean;
  unread: number;
}
export interface TipText {
  headline: string;
  body: string;
  /** The pixel strawberry follows the body (the Blue Bot tip, shown in Strawberry Milk). */
  berry: boolean;
}
const SKIN_BODY = 'try it now~ click here';
const ACTIONS: Readonly<Record<TipId, TipAction>> = {
  'skin-blue-bot': 'skin',
  'skin-strawberry-milk': 'skin',
  'click-buddy': 'next',
  sound: 'sound',
  unread: 'inbox',
  'hide-sessions': 'next',
};
/** Days from 1970-01-01 to the given calendar date (month 1–12). Date.UTC only does arithmetic; it reads no clock. */
export function dayNumber(year: number, month: number, day: number): number {
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}
/** A tip that points at something that does not apply is skipped (Requirement 9.1, S17). */
export function applies(id: TipId, c: TipContext): boolean {
  switch (id) {
    case 'skin-blue-bot':
      return c.theme === 'strawberry-milk';
    case 'skin-strawberry-milk':
      return c.theme === 'blue-bot';
    case 'sound':
      return c.sound;
    case 'unread':
      return c.unread > 0;
    case 'click-buddy':
    case 'hide-sessions':
      return true;
  }
}
/** The tips that apply, in list order. Never empty: two tips always apply. */
export function applicableTips(c: TipContext): TipId[] {
  return TIP_IDS.filter((id) => applies(id, c));
}
/** The starting tip: position `day mod n` of the applicable tips (Requirement 9.3, S18). */
export function startTip(day: number, c: TipContext): TipId {
  const tips = applicableTips(c);
  const n = tips.length;
  return tips[((Math.trunc(day) % n) + n) % n]!;
}
/** The first applicable tip after `current` in list order, wrapping; `current` itself may no longer apply. */
export function nextTip(current: TipId, c: TipContext): TipId {
  const at = TIP_IDS.indexOf(current);
  for (let i = 1; i <= TIP_IDS.length; i++) {
    const id = TIP_IDS[(at + i) % TIP_IDS.length]!;
    if (applies(id, c)) return id;
  }
  return current; // not reached: two tips always apply
}
/** The shown tip while it applies; once the user's own action makes it stop applying, the next one (S15). */
export function keepTip(current: TipId, c: TipContext): TipId {
  return applies(current, c) ? current : nextTip(current, c);
}
export function tipAction(id: TipId): TipAction {
  return ACTIONS[id];
}
export function tipText(id: TipId, c: TipContext): TipText {
  switch (id) {
    case 'skin-blue-bot':
      return { headline: '★ NEW! Blue Bot skin ★', body: SKIN_BODY, berry: true };
    case 'skin-strawberry-milk':
      return { headline: '★ NEW! Strawberry Milk skin ★', body: SKIN_BODY, berry: false };
    case 'click-buddy':
      return { headline: 'TIP ▶ click a buddy', body: 'to jump straight to its window~', berry: false };
    case 'sound':
      return { headline: 'Too many dings?', body: 'turn the sound off here', berry: false };
    case 'unread':
      return {
        headline: c.unread === 1 ? '1 unread message waiting!' : `${c.unread} unread messages waiting!`,
        body: 'click to open your inbox',
        berry: false,
      };
    case 'hide-sessions':
      return { headline: 'Busy? hide old sessions', body: 'press × on a session row', berry: false };
  }
}
