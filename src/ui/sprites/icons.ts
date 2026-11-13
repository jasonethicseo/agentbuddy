// Pixel icons (retro-skin Requirements 4.5, 4.6, 4.8; design "Pixel icons"; design.md "Drawn icons").
// Rectangles by role, no colors: sprites.css colors each role from the skin tokens (`ink` is the text color).
// The berry and the toolbar icons are copied from MainCute2000 / MainBot2000; check, pencil and the
// group boxes are drawn here because the mockups set them as characters Galmuri lacks.
const SVG = 'http://www.w3.org/2000/svg';
export type IconRole =
  | 'ink'
  | 'tree-box'
  | 'tree-box-bg'
  | 'berry-leaf'
  | 'berry-red'
  | 'berry-seed'
  | 'icon-1'
  | 'icon-2'
  | 'icon-paper'
  | 'icon-swatch-a'
  | 'icon-swatch-b'
  | 'icon-frame';
export interface IconRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly role: IconRole;
}
export interface IconDef {
  /** Cells per side. */
  readonly grid: number;
  readonly rects: readonly IconRect[];
}
const r = (x: number, y: number, w: number, h: number, role: IconRole): IconRect => ({ x, y, w, h, role });
const BOX: IconRect[] = [r(0, 0, 9, 1, 'tree-box'), r(0, 8, 9, 1, 'tree-box'), r(0, 1, 1, 7, 'tree-box'), r(8, 1, 1, 7, 'tree-box'), r(1, 1, 7, 7, 'tree-box-bg'), r(2, 4, 5, 1, 'ink')];
export const ICONS = {
  berry: {
    grid: 8,
    rects: [
      r(2, 0, 1, 1, 'berry-leaf'), r(5, 0, 1, 1, 'berry-leaf'), r(1, 1, 6, 1, 'berry-leaf'),
      r(0, 2, 8, 1, 'berry-red'), r(0, 3, 8, 1, 'berry-red'), r(0, 4, 8, 1, 'berry-red'), r(1, 5, 6, 1, 'berry-red'), r(2, 6, 4, 1, 'berry-red'), r(3, 7, 2, 1, 'berry-red'),
      r(1, 3, 1, 1, 'berry-seed'), r(5, 3, 1, 1, 'berry-seed'), r(3, 4, 1, 1, 'berry-seed'), r(2, 5, 1, 1, 'berry-seed'), r(6, 4, 1, 1, 'berry-seed'),
    ],
  },
  'tool-buddies': { grid: 8, rects: [r(2, 0, 3, 3, 'icon-1'), r(1, 4, 5, 3, 'icon-1'), r(5, 1, 2, 2, 'icon-2'), r(5, 4, 3, 3, 'icon-2')] },
  'tool-inbox': {
    grid: 8,
    rects: [
      r(0, 1, 8, 6, 'icon-paper'), r(0, 1, 8, 1, 'icon-1'), r(0, 6, 8, 1, 'icon-1'), r(0, 1, 1, 6, 'icon-1'), r(7, 1, 1, 6, 'icon-1'),
      r(1, 2, 1, 1, 'icon-1'), r(2, 3, 1, 1, 'icon-1'), r(3, 4, 2, 1, 'icon-1'), r(5, 3, 1, 1, 'icon-1'), r(6, 2, 1, 1, 'icon-1'),
    ],
  },
  'tool-settings': { grid: 8, rects: [r(3, 0, 2, 8, 'icon-1'), r(0, 3, 8, 2, 'icon-1'), r(1, 1, 6, 6, 'icon-1'), r(3, 3, 2, 2, 'icon-paper')] },
  'tool-skin': {
    grid: 8,
    rects: [
      r(1, 1, 6, 6, 'icon-swatch-a'), r(1, 1, 3, 3, 'icon-swatch-b'), r(4, 4, 3, 3, 'icon-swatch-b'),
      r(0, 0, 8, 1, 'icon-frame'), r(0, 7, 8, 1, 'icon-frame'), r(0, 0, 1, 8, 'icon-frame'), r(7, 0, 1, 8, 'icon-frame'),
    ],
  },
  check: { grid: 7, rects: [r(6, 0, 1, 1, 'ink'), r(5, 1, 1, 1, 'ink'), r(4, 2, 1, 1, 'ink'), r(0, 2, 1, 1, 'ink'), r(1, 3, 1, 1, 'ink'), r(3, 3, 1, 1, 'ink'), r(2, 4, 1, 1, 'ink')] },
  pencil: { grid: 7, rects: [r(5, 0, 2, 1, 'ink'), r(4, 1, 3, 1, 'ink'), r(3, 2, 3, 1, 'ink'), r(2, 3, 3, 1, 'ink'), r(1, 4, 3, 1, 'ink'), r(0, 5, 2, 1, 'ink'), r(0, 6, 1, 1, 'ink')] },
  'box-open': { grid: 9, rects: BOX },
  'box-closed': { grid: 9, rects: [...BOX, r(4, 2, 1, 5, 'ink')] },
} as const satisfies Record<string, IconDef>;
export type IconName = keyof typeof ICONS;
/** An `<svg>` of the icon at `size` px, hidden from screen readers; built with createElementNS only. */
export function icon(name: IconName, size: number): SVGSVGElement {
  const def: IconDef = ICONS[name];
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', `icon icon-${name}`);
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', `0 0 ${def.grid} ${def.grid}`);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('aria-hidden', 'true');
  for (const p of def.rects) {
    const rect = document.createElementNS(SVG, 'rect');
    rect.setAttribute('x', String(p.x));
    rect.setAttribute('y', String(p.y));
    rect.setAttribute('width', String(p.w));
    rect.setAttribute('height', String(p.h));
    rect.setAttribute('class', `ic-${p.role}`);
    svg.append(rect);
  }
  return svg;
}
