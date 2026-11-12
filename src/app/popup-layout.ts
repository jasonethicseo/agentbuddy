// Where pop-ups go: a stack in the bottom-right corner of the visible area, oldest at
// the bottom, each newer one above it (messenger-app Requirements 9.1, 9.6). Pure.

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Size {
  width: number;
  height: number;
}
export interface Point {
  x: number;
  y: number;
}

/** How many pop-ups fit in `area` with `margin` around and `gap` between them. */
export function popupCapacity(area: Rect, size: Size, gap: number, margin: number): number {
  if (area.width - 2 * margin < size.width) return 0;
  return Math.max(0, Math.floor((area.height - 2 * margin + gap) / (size.height + gap)));
}

/** Top-left corners for `count` pop-ups (at most the capacity); index 0 is the oldest, at the bottom. */
export function placePopups(count: number, area: Rect, size: Size, gap: number, margin: number): Point[] {
  const n = Math.min(Math.max(0, Math.floor(count)), popupCapacity(area, size, gap, margin));
  const x = area.x + area.width - margin - size.width;
  const bottom = area.y + area.height - margin - size.height;
  return Array.from({ length: n }, (_, i) => ({ x, y: bottom - i * (size.height + gap) }));
}
