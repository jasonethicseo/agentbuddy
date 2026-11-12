// P22: pop-up placement (messenger-app Requirements 9.1, 9.6).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { placePopups, popupCapacity } from '../../src/app/popup-layout';

describe('P22 pop-up placement', () => {
  it('every pop-up lies inside the area, none overlap, each newer one is above, and no more than fit', () => {
    fc.assert(
      fc.property(
        fc.record({ x: fc.integer({ min: -2000, max: 2000 }), y: fc.integer({ min: 0, max: 100 }), width: fc.integer({ min: 0, max: 3000 }), height: fc.integer({ min: 0, max: 2000 }) }),
        fc.record({ width: fc.integer({ min: 1, max: 600 }), height: fc.integer({ min: 1, max: 400 }) }),
        fc.integer({ min: 0, max: 40 }),
        fc.integer({ min: 0, max: 40 }),
        fc.integer({ min: 0, max: 30 }),
        (area, size, gap, margin, count) => {
          const cap = popupCapacity(area, size, gap, margin);
          const points = placePopups(count, area, size, gap, margin);
          expect(points).toHaveLength(Math.min(count, cap));
          points.forEach((p, i) => {
            expect(p.x).toBeGreaterThanOrEqual(area.x + margin);
            expect(p.x + size.width).toBeLessThanOrEqual(area.x + area.width - margin);
            expect(p.y).toBeGreaterThanOrEqual(area.y + margin);
            expect(p.y + size.height).toBeLessThanOrEqual(area.y + area.height - margin);
            if (i > 0) expect(p.y + size.height + gap).toBeLessThanOrEqual(points[i - 1]!.y); // above, no overlap
          });
          // One more would not fit.
          const fitsOneMore = area.width - 2 * margin >= size.width && (cap + 1) * size.height + cap * gap <= area.height - 2 * margin;
          expect(fitsOneMore).toBe(false);
        },
      ),
      { numRuns: 2000 },
    );
  });
});
