// The TIP banner's tips: conditions, the date-based start, the click order, keepTip (retro-skin Requirement 9).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TIP_IDS, applicableTips, applies, dayNumber, keepTip, nextTip, startTip, tipAction, tipText } from '../../src/core/tips';
import type { TipContext } from '../../src/core/tips';
const blue: TipContext = { theme: 'blue-bot', sound: true, unread: 0, skinChangedToday: false };
const pink: TipContext = { theme: 'strawberry-milk', sound: true, unread: 2, skinChangedToday: false };
describe('conditions (Requirement 9.1)', () => {
  it('each skin tip only in the other skin; sound only while it is on; unread only above 0', () => {
    expect(applicableTips(blue)).toEqual(['skin-strawberry-milk', 'click-buddy', 'sound', 'hide-sessions']);
    expect(applicableTips(pink)).toEqual(['skin-blue-bot', 'click-buddy', 'sound', 'unread', 'hide-sessions']);
    expect(applicableTips({ ...blue, sound: false })).toEqual(['skin-strawberry-milk', 'click-buddy', 'hide-sessions']);
  });
  it('click-buddy and hide-sessions always apply', () => {
    for (const theme of ['blue-bot', 'strawberry-milk'] as const) {
      for (const sound of [true, false]) {
        const c = { theme, sound, unread: 0, skinChangedToday: true };
        expect([applies('click-buddy', c), applies('hide-sessions', c)]).toEqual([true, true]);
      }
    }
  });
});
describe('dayNumber and startTip (Requirement 9.3, S18)', () => {
  it('counts days from 1970-01-01', () => {
    expect(dayNumber(1970, 1, 1)).toBe(0);
    expect(dayNumber(1970, 1, 2)).toBe(1);
    expect(dayNumber(2026, 11, 13)).toBe(20_770);
    expect(dayNumber(1969, 12, 31)).toBe(-1);
  });
  it('picks applicable[day mod n], so the same day gives the same tip and the next day the next one', () => {
    const d = dayNumber(2026, 11, 13); // 20770 mod 4 = 2
    expect(startTip(d, blue)).toBe('sound');
    expect(startTip(d, blue)).toBe('sound');
    expect(startTip(d + 1, blue)).toBe('hide-sessions');
    expect(startTip(d + 2, blue)).toBe('skin-strawberry-milk');
    expect(startTip(d, pink)).toBe('skin-blue-bot'); // 20770 mod 5 = 0
  });
  it('gives an applicable tip for days before 1970', () => {
    expect(startTip(-1, blue)).toBe('hide-sessions');
  });
});
describe('nextTip and keepTip (Requirements 9.6, 9.7)', () => {
  it('goes to the next applicable tip in list order and wraps', () => {
    expect(nextTip('skin-strawberry-milk', blue)).toBe('click-buddy');
    expect(nextTip('sound', blue)).toBe('hide-sessions'); // unread is skipped at 0
    expect(nextTip('hide-sessions', blue)).toBe('skin-strawberry-milk');
  });
  it('keeps the shown tip while it applies', () => {
    for (const id of applicableTips(pink)) expect(keepTip(id, pink)).toBe(id);
  });
  it('moves on when the user switches skin from the skin tip, turns the sound off, or reads the inbox', () => {
    expect(keepTip('skin-blue-bot', { ...pink, theme: 'blue-bot' })).toBe('skin-strawberry-milk'); // the next in list order
    expect(keepTip('sound', { ...pink, sound: false })).toBe('unread');
    expect(keepTip('unread', { ...pink, unread: 0 })).toBe('hide-sessions');
  });
});
describe('texts and actions', () => {
  it('says message for one and messages for more', () => {
    expect(tipText('unread', { ...pink, unread: 1 }).headline).toBe('1 unread message waiting!');
    expect(tipText('unread', { ...pink, unread: 3 }).headline).toBe('3 unread messages waiting!');
  });
  it('has the words and actions of the requirements, and the strawberry only on the Blue Bot tip', () => {
    expect(TIP_IDS.map((id) => [tipText(id, pink).headline, tipText(id, pink).body, tipAction(id), tipText(id, pink).berry])).toEqual([
      ['★ NEW! Blue Bot skin ★', 'try it now~ click here', 'skin', true],
      ['★ NEW! Strawberry Milk skin ★', 'try it now~ click here', 'skin', false],
      ['TIP ▶ click a buddy', 'to jump straight to its window~', 'next', false],
      ['Too many dings?', 'turn the sound off here', 'sound', false],
      ['2 unread messages waiting!', 'click to open your inbox', 'inbox', false],
      ['Busy? hide old sessions', 'press × on a session row', 'next', false],
    ]);
  });
  it('reads no clock (Requirement 9.2)', () => {
    const code = readFileSync(join(import.meta.dirname, '../../src/core/tips.ts'), 'utf8');
    expect(code).not.toMatch(/Date\.now|new Date\(|performance|setTimeout|setInterval/);
  });
});
describe('no skin tip on the day the user changed the skin (S19)', () => {
  it('skips both skin tips in either skin, and nothing else', () => {
    expect(applicableTips({ ...blue, skinChangedToday: true })).toEqual(['click-buddy', 'sound', 'hide-sessions']);
    expect(applicableTips({ ...pink, skinChangedToday: true })).toEqual(['click-buddy', 'sound', 'unread', 'hide-sessions']);
  });
  it('after switching from Strawberry Milk to Blue Bot through the skin tip, the banner moves to a non-skin tip', () => {
    expect(keepTip('skin-blue-bot', { ...pink, theme: 'blue-bot', skinChangedToday: true })).toBe('click-buddy');
  });
  it('the start and next tips of that day are never skin tips', () => {
    for (let day = 0; day < 20; day++) {
      for (const c of [{ ...blue, skinChangedToday: true }, { ...pink, skinChangedToday: true }]) {
        expect(startTip(day, c).startsWith('skin-')).toBe(false);
        expect(nextTip(startTip(day, c), c).startsWith('skin-')).toBe(false);
      }
    }
  });
});
