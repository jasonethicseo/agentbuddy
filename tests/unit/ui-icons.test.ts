// State icons and the bubble as data (messenger-app Requirements 5.8, 6.7, 6.13; design.md "Status icons").
import { describe, expect, it } from 'vitest';
import { RANK } from '../../src/core/buddies';
import type { DisplayState } from '../../src/core/state';
import { BUBBLE } from '../../src/app/icon';
import { BUBBLE_SHAPES, CRESCENT, STATE_ICONS, STATE_NAMES } from '../../src/ui/icons';

const STATES = Object.keys(RANK) as DisplayState[];
const CLASSES = new Set(['i-fill', 'i-glyph', 'i-mark', 'i-ring', 'b-body', 'b-eye']);

describe('state icons', () => {
  it('every state has an icon and a screen-reader name', () => {
    for (const s of STATES) {
      expect(STATE_ICONS[s].length).toBeGreaterThan(0);
      expect(STATE_NAMES[s]).toMatch(/^[a-z ]+$/);
    }
  });

  it('each state differs by shape or glyph, not only by color', () => {
    const signature = (s: DisplayState) =>
      JSON.stringify(STATE_ICONS[s].map((x) => [x.tag, x.cls === 'i-fill' ? 'fill' : x.cls, x.attrs['d'] ?? '', x.text ?? '']));
    const all = STATES.map(signature);
    // WAITING_APPROVAL, WORKING and STALE share the disc but differ in their glyph.
    expect(new Set(all).size).toBe(STATES.length);
    expect(STATE_ICONS.WAITING_APPROVAL.find((x) => x.tag === 'text')?.text).toBe('!');
    expect(STATE_ICONS.WORKING.find((x) => x.tag === 'text')?.text).toBe('♪');
    expect(STATE_ICONS.STALE.find((x) => x.tag === 'text')?.text).toBe('?');
  });

  it('uses classes for color, never a color value', () => {
    for (const s of STATES) {
      for (const shape of STATE_ICONS[s]) {
        expect(CLASSES.has(shape.cls)).toBe(true);
        expect(Object.keys(shape.attrs)).not.toContain('fill');
        expect(Object.keys(shape.attrs)).not.toContain('stroke');
        expect(JSON.stringify(shape.attrs)).not.toMatch(/#[0-9a-f]{3,8}/i);
      }
    }
  });

  it('draws the crescent as one path whose ends lie on both circles of the mockup', () => {
    const nums = CRESCENT.match(/-?\d+(\.\d+)?/g)!.map(Number);
    const [x1, y1] = [nums[0]!, nums[1]!];
    const [x2, y2] = [nums[7]!, nums[8]!];
    for (const [x, y] of [
      [x1, y1],
      [x2, y2],
    ] as const) {
      expect(Math.hypot(x - 7, y - 7)).toBeCloseTo(6, 1);
      expect(Math.hypot(x - 9, y - 5.5)).toBeCloseTo(4.5, 1);
    }
  });
});

describe('bubble', () => {
  it('matches the menu bar icon pixel for pixel', () => {
    const grid = Array.from({ length: 16 }, () => Array<string>(16).fill('.'));
    for (const r of BUBBLE_SHAPES) {
      const [x, y, w, h] = ['x', 'y', 'width', 'height'].map((k) => Number(r.attrs[k]));
      for (let yy = y!; yy < y! + h!; yy++) for (let xx = x!; xx < x! + w!; xx++) grid[yy]![xx] = r.cls === 'b-eye' ? '.' : '#';
    }
    expect(grid.map((row) => row.join(''))).toEqual(BUBBLE);
  });
});
