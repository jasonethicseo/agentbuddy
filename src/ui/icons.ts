// The seven state icons and the bubble, as in docs/mockups/Icons.dc.html
// (messenger-app Requirements 5.8, 6.7, 6.13). The shapes are plain data, tested
// without a DOM; `stateIcon` and `bubbleIcon` build SVG elements from them.
// Colors come from classes styled in styles/icons.css, never from hex values here.
import type { DisplayState } from '../core/state';

export interface Shape {
  tag: 'circle' | 'path' | 'text' | 'rect';
  /** i-fill (state color), i-glyph (white text), i-mark (white stroke), i-ring (muted stroke), b-body, b-eye. */
  cls: string;
  attrs: Readonly<Record<string, string>>;
  text?: string;
}

const disc: Shape = { tag: 'circle', cls: 'i-fill', attrs: { cx: '7', cy: '7', r: '6' } };
const glyph = (text: string, size: string): Shape => ({
  tag: 'text',
  cls: 'i-glyph',
  attrs: { x: '7', y: '10.5', 'text-anchor': 'middle', 'font-size': size },
  text,
});
const ring: Shape = { tag: 'circle', cls: 'i-ring', attrs: { cx: '7', cy: '7', r: '5.2' } };

/**
 * The idle crescent: the circle r 6 at (7, 7) minus the circle r 4.5 at (9, 5.5), as one path,
 * so the cut-out stays transparent on tinted rows. The two circles meet at (8.07, 1.10) and (12.97, 7.62).
 */
export const CRESCENT = 'M8.07 1.1 A6 6 0 1 0 12.97 7.62 A4.5 4.5 0 1 1 8.07 1.1 Z';

export const STATE_ICONS: Readonly<Record<DisplayState, readonly Shape[]>> = {
  WAITING_APPROVAL: [disc, glyph('!', '10')],
  WORKING: [disc, glyph('♪', '9')],
  TURN_DONE: [disc, { tag: 'path', cls: 'i-mark', attrs: { d: 'M4 7.2 L6.2 9.3 L10 5' } }],
  STALE: [disc, glyph('?', '10')],
  IDLE: [{ tag: 'path', cls: 'i-fill', attrs: { d: CRESCENT } }],
  OFFLINE: [ring],
  ENDED: [ring, { tag: 'path', cls: 'i-ring', attrs: { d: 'M5 5 L9 9 M9 5 L5 9' } }],
};

/** Read by screen readers instead of the icon. */
export const STATE_NAMES: Readonly<Record<DisplayState, string>> = {
  WAITING_APPROVAL: 'waiting for approval',
  WORKING: 'working',
  TURN_DONE: 'turn done',
  STALE: 'no news',
  IDLE: 'idle',
  OFFLINE: 'offline',
  ENDED: 'logged off',
};

/** The bubble of design.md on a 16 × 16 grid: a 14 × 10 block, a 3 × 3 tail, two 2 × 2 eyes. */
export const BUBBLE_SHAPES: readonly Shape[] = [
  { tag: 'rect', cls: 'b-body', attrs: { x: '1', y: '2', width: '14', height: '10' } },
  { tag: 'rect', cls: 'b-body', attrs: { x: '3', y: '12', width: '3', height: '3' } },
  { tag: 'rect', cls: 'b-eye', attrs: { x: '5', y: '6', width: '2', height: '2' } },
  { tag: 'rect', cls: 'b-eye', attrs: { x: '9', y: '6', width: '2', height: '2' } },
];

const SVG_NS = 'http://www.w3.org/2000/svg'; // an XML namespace name, never fetched

function svg(shapes: readonly Shape[], size: number, viewBox: string, cls: string): SVGSVGElement {
  const root = document.createElementNS(SVG_NS, 'svg');
  root.setAttribute('width', String(size));
  root.setAttribute('height', String(size));
  root.setAttribute('viewBox', viewBox);
  root.setAttribute('aria-hidden', 'true');
  root.setAttribute('focusable', 'false');
  root.setAttribute('class', cls);
  for (const s of shapes) {
    const el = document.createElementNS(SVG_NS, s.tag);
    el.setAttribute('class', s.cls);
    for (const [k, v] of Object.entries(s.attrs)) el.setAttribute(k, v);
    if (s.text !== undefined) el.textContent = s.text;
    root.append(el);
  }
  return root;
}

/** The state icon (hidden from screen readers) followed by the state name for them. */
export function stateIcon(state: DisplayState, size: 12 | 14 | 28): [SVGSVGElement, HTMLSpanElement] {
  const name = document.createElement('span');
  name.className = 'sr-only';
  name.textContent = STATE_NAMES[state];
  return [svg(STATE_ICONS[state], size, '0 0 14 14', `icon icon-${state}`), name];
}

/** The bubble: white with blue eyes on the title bar, or blue with white eyes (`dark`). */
export function bubbleIcon(size: number, dark = false): SVGSVGElement {
  return svg(BUBBLE_SHAPES, size, '0 0 16 16', dark ? 'bubble bubble-dark' : 'bubble');
}
