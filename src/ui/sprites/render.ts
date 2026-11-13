// Builds a sprite and its state badge (themes Requirements 6.4–6.9; retro-skin Requirement 4; design "Sprites").
// Only attributes and createElementNS; no colors here: sprites.css colors each role from themes.css.
import type { AgentId } from '../../core/event';
import type { DisplayState } from '../../core/state';
import type { ThemeId } from '../../core/theme';
import { sprites as blueBot } from './blue-bot';
import { icon } from './icons';
import { sprites as strawberryMilk } from './strawberry-milk';
import type { Pixel, SpriteModule } from './types';

export const SPRITES: Readonly<Record<ThemeId, SpriteModule>> = { 'blue-bot': blueBot, 'strawberry-milk': strawberryMilk };

/** 12 session rows, 16 title bar and Skin tiles, 24 buddy and inbox rows, 28 TIP banner, 36 `me` and pop-ups. */
export type SpriteSize = 12 | 16 | 24 | 28 | 36;
export type SpriteWho = AgentId | 'me' | 'title' | 'banner';

const SVG = 'http://www.w3.org/2000/svg';

/** The pixels of one sprite: a state face for an agent, else the title icon, `me` or the banner mascot. */
export function spritePixels(theme: ThemeId, who: SpriteWho, state: DisplayState | null): readonly Pixel[] {
  const m = SPRITES[theme];
  if (who === 'title') return m.title;
  if (who === 'me') return m.me;
  if (who === 'banner') return m.banner;
  return m.faces[state ?? 'WORKING'];
}

/**
 * A badge sits on agent sprites of 24 px and larger, for every state but OFFLINE. In use that is exactly
 * buddy rows (24), inbox rows (24) and pop-ups (36): never session rows (12) or Skin tiles (16) (retro-skin Requirement 4.4, S10).
 */
export function hasBadge(who: SpriteWho, state: DisplayState | null, size: SpriteSize): boolean {
  return who !== 'me' && who !== 'title' && who !== 'banner' && state !== null && state !== 'OFFLINE' && size >= 24;
}

/** The state's name for screen readers, next to every sprite (messenger-app Requirement 6.13). */
export const STATE_NAMES: Readonly<Record<DisplayState, string>> = {
  WAITING_APPROVAL: 'waiting for approval',
  WORKING: 'working',
  TURN_DONE: 'turn done',
  STALE: 'no news',
  IDLE: 'idle',
  OFFLINE: 'offline',
  ENDED: 'logged off',
};

/** An agent's state sprite and, after it, the state name as screen-reader text. */
export function stateSprite(theme: ThemeId, agent: AgentId, state: DisplayState, size: SpriteSize): [HTMLSpanElement, HTMLSpanElement] {
  const name = document.createElement('span');
  name.className = 'sr-only';
  name.textContent = STATE_NAMES[state];
  return [sprite(theme, agent, state, size), name];
}

/** `<span class="sprite">` with the SVG and, where Requirement 6.5 asks, the badge; hidden from screen readers. */
export function sprite(theme: ThemeId, who: SpriteWho, state: DisplayState | null, size: SpriteSize): HTMLSpanElement {
  const wrap = document.createElement('span');
  wrap.className = 'sprite';
  wrap.dataset['agent'] = who;
  wrap.dataset['size'] = String(size);
  wrap.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 12 12');
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('focusable', 'false');
  for (const p of spritePixels(theme, who, state)) {
    const r = document.createElementNS(SVG, 'rect');
    r.setAttribute('x', String(p.x));
    r.setAttribute('y', String(p.y));
    r.setAttribute('width', String(p.w));
    r.setAttribute('height', String(p.h));
    r.setAttribute('class', `px px-${p.role}`);
    svg.append(r);
  }
  wrap.append(svg);
  if (hasBadge(who, state, size)) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.dataset['state'] = state!;
    if (state === 'TURN_DONE') badge.append(icon('check', 7)); // Galmuri has no ✓ (retro-skin Requirement 4.5)
    wrap.append(badge);
  }
  return wrap;
}
