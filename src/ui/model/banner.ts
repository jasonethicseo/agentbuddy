// The TIP banner as plain data (retro-skin Requirement 9; design "TIP banner"). Pure.
import type { AppSnapshot } from '../../core/snapshot';
import { tipAction, tipText } from '../../core/tips';
import type { TipAction, TipContext, TipId } from '../../core/tips';
import type { Tab } from './chrome';
import { unreadCount } from './inbox';
export interface BannerVM {
  id: TipId;
  headline: string;
  body: string;
  /** The pixel strawberry after the body. */
  berry: boolean;
  action: TipAction;
}
/**
 * What the tips' conditions read: the skin, the Ding! sound switch, the Inbox count, and whether the user changed
 * the skin earlier today (S19; the caller keeps that day in memory only).
 */
export function tipContext(s: AppSnapshot, skinChangedToday = false): TipContext {
  return { theme: s.settings.theme, sound: s.settings.sound, unread: unreadCount(s.inbox), skinChangedToday };
}
/** null while the banner is not shown: the browser page, the Inbox and Settings screens, or hideBanner (Requirement 9.9). */
export function bannerView(s: AppSnapshot, tab: Tab, tip: TipId | null): BannerVM | null {
  if (tip === null || s.mode === 'browser' || tab !== 'list' || s.settings.hideBanner) return null;
  return { id: tip, ...tipText(tip, tipContext(s)), action: tipAction(tip) };
}
