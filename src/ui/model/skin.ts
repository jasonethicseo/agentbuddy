// The Skin group's two tiles and the Settings notes as plain data (themes Requirements 2.1, 2.2;
// retro-skin Requirements 1, 10.4, 12.3). Pure. "Skin" on screen; `theme` in code and in the settings file.
import { THEME_NAMES } from '../../core/theme';
import type { ThemeId } from '../../core/theme';
export interface SkinTileVM {
  id: ThemeId;
  name: string;
  checked: boolean;
}
/** In the order of SkinPicker2000.dc.html: Blue Bot, then Strawberry Milk; the current one is checked. */
export function skinTiles(current: ThemeId): SkinTileVM[] {
  return (['blue-bot', 'strawberry-milk'] as const).map((id) => ({ id, name: THEME_NAMES[id], checked: id === current }));
}
export const SKIN_NOTE = 'Changes the window and the popups at once. Saved on this computer only.';
export const BANNER_NOTE = 'Tips are built in. Nothing is downloaded.';
