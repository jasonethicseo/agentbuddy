// The two themes (themes spec, Requirement 1). Pure: no file system, network, timers or clock.

export const THEMES = ['blue-bot', 'strawberry-milk'] as const;
export type ThemeId = (typeof THEMES)[number];
export const DEFAULT_THEME: ThemeId = 'blue-bot';

/** Names shown in the Skin group; they never mention gender (design.md "Skins"). */
export const THEME_NAMES: Readonly<Record<ThemeId, string>> = {
  'blue-bot': 'Blue Bot',
  'strawberry-milk': 'Strawberry Milk',
};

/** Exactly one of the two theme IDs. */
export function isTheme(v: unknown): v is ThemeId {
  return typeof v === 'string' && (THEMES as readonly string[]).includes(v);
}

/** The theme a stored or received value names, else the default. Never throws. */
export function parseTheme(v: unknown): ThemeId {
  return isTheme(v) ? v : DEFAULT_THEME;
}
