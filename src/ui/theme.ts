// Puts the theme (and the main window's frame) on <html>, where themes.css picks it up
// (themes Requirements 2.4, 2.7, 2.8). The only place that writes `data-theme`.
import { parseTheme } from '../core/theme';
import type { ThemeId } from '../core/theme';

/** Set the theme; does nothing when it is already set. */
export function applyTheme(theme: ThemeId): void {
  const root = document.documentElement;
  if (root.dataset['theme'] !== theme) root.dataset['theme'] = theme;
}

/**
 * Read `?theme=` (and `&frame=` for the main window) from the page's own URL, which the main
 * process sets, so the first frame is already in the saved theme. Without a query, as on the
 * relay's page in a browser, the theme is Blue Bot.
 */
export function applyThemeFromUrl(search: string = location.search): ThemeId {
  const q = new URLSearchParams(search);
  const theme = parseTheme(q.get('theme'));
  applyTheme(theme);
  if (q.get('frame') === 'opaque' || q.get('frame') === 'transparent') document.documentElement.dataset['frame'] = q.get('frame')!;
  return theme;
}
