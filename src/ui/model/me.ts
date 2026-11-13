// The "me" row: the user's own status message (messenger-app Requirement 18). Pure.
import { MY_STATUS_LIMIT } from '../../core/config';
import type { AppSnapshot } from '../../core/snapshot';
import type { ThemeId } from '../../core/theme';
import { firstCodePoints } from '../../core/text';
import type { Tab } from './chrome';

export const MY_STATUS_HINT = 'set your status';

export interface MeView {
  /** The saved message, '' when unset. */
  text: string;
  /** Show the hint instead of a message. */
  hint: boolean;
  /** For the `me` sprite. */
  theme: ThemeId;
}

/** The row on the Buddies tab of the app; `null` elsewhere and in the browser (Requirement 18.1). */
export function meView(s: AppSnapshot, tab: Tab): MeView | null {
  if (s.mode === 'browser' || tab !== 'list') return null;
  return { text: s.settings.myStatus, hint: s.settings.myStatus === '', theme: s.settings.theme };
}

/** What the field may hold while typing: at most 40 code points (Requirement 18.4). */
export function limitStatusInput(value: string): string {
  return firstCodePoints(value, MY_STATUS_LIMIT);
}
