// Menu bar icon: the speech bubble of design.md, drawn in code (messenger-app Requirement 5.8).
// A 14 × 10 block with a 3 × 3 tail and two 2 × 2 eyes cut out, on a 16 × 16 grid.
// Pure: returns pixel data; tray.ts turns it into a macOS template image.

type Box = readonly [x: number, y: number, w: number, h: number];
const BLOCK: Box = [1, 2, 14, 10];
const TAIL: Box = [3, 12, 3, 3];
const EYES: readonly Box[] = [
  [5, 6, 2, 2],
  [9, 6, 2, 2],
];

const inside = ([x, y, w, h]: Box, px: number, py: number) => px >= x && px < x + w && py >= y && py < y + h;

/** The 16 × 16 grid as rows of `#` (filled) and `.` (clear). */
export const BUBBLE: readonly string[] = Array.from({ length: 16 }, (_, py) =>
  Array.from({ length: 16 }, (_, px) =>
    (inside(BLOCK, px, py) || inside(TAIL, px, py)) && !EYES.some((e) => inside(e, px, py)) ? '#' : '.',
  ).join(''),
);

export interface Bitmap {
  width: number;
  height: number;
  /** RGBA rows: black where filled, alpha 0 elsewhere. */
  data: Uint8Array;
}

/** The bubble at 16 × 16 (`scale` 1) or 32 × 32 (`scale` 2, every pixel doubled). */
export function bubbleBitmap(scale: 1 | 2): Bitmap {
  const size = 16 * scale;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (BUBBLE[Math.floor(y / scale)]![Math.floor(x / scale)] === '#') data[(y * size + x) * 4 + 3] = 255;
    }
  }
  return { width: size, height: size, data };
}
