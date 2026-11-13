// The Theme card's two tiles as plain data (themes Requirement 2.1, 2.2). Pure.
import { THEME_NAMES } from '../../core/theme';
import type { ThemeId } from '../../core/theme';

export interface ThemeTileVM {
  id: ThemeId;
  name: string;
  checked: boolean;
}

/** In the order of ThemePicker.dc.html: Strawberry Milk, then Blue Bot; the current one is checked. */
export function themeTiles(current: ThemeId): ThemeTileVM[] {
  return (['strawberry-milk', 'blue-bot'] as const).map((id) => ({ id, name: THEME_NAMES[id], checked: id === current }));
}

export const THEME_NOTE = 'Changes the window and the popups at once. Saved on this computer only.';
