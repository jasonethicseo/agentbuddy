// The shape every theme's sprite module exports (themes Requirement 6.1; design "Sprites").
// A pixel names a role, never a color: themes.css gives each role its color (`--px-<role>`),
// and `body` takes the agent's color.
import type { DisplayState } from '../../core/state';

export type PixelRole =
  | 'body'
  | 'ink'
  | 'tear'
  | 'cheek'
  | 'visor'
  | 'acc-wait'
  | 'acc-work'
  | 'acc-done'
  | 'acc-stale'
  | 'acc-idle'
  | 'dim'
  | 'grey-body'
  | 'grey-visor'
  | 'grey-ink'
  | 'title-body'
  | 'title-ink'
  | 'title-cheek'
  | 'me-cheek';

export const PIXEL_ROLES: readonly PixelRole[] = [
  'body', 'ink', 'tear', 'cheek', 'visor', 'acc-wait', 'acc-work', 'acc-done', 'acc-stale', 'acc-idle', 'dim',
  'grey-body', 'grey-visor', 'grey-ink', 'title-body', 'title-ink', 'title-cheek', 'me-cheek',
];

/** One rectangle on the 12 × 12 grid. */
export interface Pixel {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly role: PixelRole;
}

export interface SpriteModule {
  /** One face per displayed state; `body` pixels take the agent's color. */
  readonly faces: Readonly<Record<DisplayState, readonly Pixel[]>>;
  /** The 20 px title-bar icon (no badge). */
  readonly title: readonly Pixel[];
  /** The 34 px `me` sprite (no badge); its `body` takes `--agent-me`. */
  readonly me: readonly Pixel[];
}

/** A rectangle, in the mockups' attribute order. */
export const px = (x: number, y: number, w: number, h: number, role: PixelRole): Pixel => ({ x, y, w, h, role });
