// Strawberry Milk sprites (retro-skin Requirement 4.1): every rectangle copied, in order, from
// docs/mockups/FacesCute2000.dc.html (the seven faces, with hair) and MainCute2000.dc.html (the 16 px title icon,
// the 36 px `me` and the 28 px banner mascot), with each mockup color replaced by its role.
// tests/unit/sprites.test.ts compares them with the mockups.
import { px } from './types';
import type { SpriteModule } from './types';
export const sprites: SpriteModule = {
  faces: {
    WAITING_APPROVAL: [
      px(3, 0, 6, 1, 'body'), px(2, 1, 8, 1, 'body'), px(1, 2, 10, 7, 'body'), px(2, 9, 8, 1, 'body'),
      px(3, 10, 6, 1, 'body'), px(3, 0, 6, 1, 'hair'), px(2, 1, 8, 1, 'hair'), px(1, 2, 10, 1, 'hair'),
      px(0, 0, 2, 2, 'hair'), px(10, 0, 2, 2, 'hair'), px(1, 3, 2, 1, 'hair'), px(5, 3, 2, 1, 'hair'),
      px(9, 3, 2, 1, 'hair'), px(4, 1, 2, 1, 'hair-hi'), px(8, 1, 1, 1, 'clip'), px(9, 2, 1, 1, 'clip'),
      px(3, 4, 3, 1, 'ink'), px(4, 5, 1, 2, 'ink'), px(6, 4, 3, 1, 'ink'), px(7, 5, 1, 2, 'ink'),
      px(4, 7, 1, 2, 'tear'), px(7, 7, 1, 2, 'tear'),
    ],
    WORKING: [
      px(3, 0, 6, 1, 'body'), px(2, 1, 8, 1, 'body'), px(1, 2, 10, 7, 'body'), px(2, 9, 8, 1, 'body'),
      px(3, 10, 6, 1, 'body'), px(3, 0, 6, 1, 'hair'), px(2, 1, 8, 1, 'hair'), px(1, 2, 10, 1, 'hair'),
      px(0, 0, 2, 2, 'hair'), px(10, 0, 2, 2, 'hair'), px(1, 3, 2, 1, 'hair'), px(5, 3, 2, 1, 'hair'),
      px(9, 3, 2, 1, 'hair'), px(4, 1, 2, 1, 'hair-hi'), px(8, 1, 1, 1, 'clip'), px(9, 2, 1, 1, 'clip'),
      px(3, 5, 1, 1, 'ink'), px(4, 4, 1, 1, 'ink'), px(5, 5, 1, 1, 'ink'), px(6, 5, 1, 1, 'ink'),
      px(7, 4, 1, 1, 'ink'), px(8, 5, 1, 1, 'ink'), px(2, 7, 1, 1, 'cheek'), px(9, 7, 1, 1, 'cheek'),
      px(5, 8, 2, 1, 'ink'),
    ],
    TURN_DONE: [
      px(3, 0, 6, 1, 'body'), px(2, 1, 8, 1, 'body'), px(1, 2, 10, 7, 'body'), px(2, 9, 8, 1, 'body'),
      px(3, 10, 6, 1, 'body'), px(3, 0, 6, 1, 'hair'), px(2, 1, 8, 1, 'hair'), px(1, 2, 10, 1, 'hair'),
      px(0, 0, 2, 2, 'hair'), px(10, 0, 2, 2, 'hair'), px(1, 3, 2, 1, 'hair'), px(5, 3, 2, 1, 'hair'),
      px(9, 3, 2, 1, 'hair'), px(4, 1, 2, 1, 'hair-hi'), px(8, 1, 1, 1, 'clip'), px(9, 2, 1, 1, 'clip'),
      px(4, 4, 1, 3, 'ink'), px(3, 5, 3, 1, 'ink'), px(7, 4, 1, 3, 'ink'), px(6, 5, 3, 1, 'ink'),
      px(2, 7, 1, 1, 'cheek'), px(9, 7, 1, 1, 'cheek'), px(4, 8, 1, 1, 'ink'), px(7, 8, 1, 1, 'ink'),
      px(5, 9, 2, 1, 'ink'),
    ],
    STALE: [
      px(3, 0, 6, 1, 'body'), px(2, 1, 8, 1, 'body'), px(1, 2, 10, 7, 'body'), px(2, 9, 8, 1, 'body'),
      px(3, 10, 6, 1, 'body'), px(3, 0, 6, 1, 'hair'), px(2, 1, 8, 1, 'hair'), px(1, 2, 10, 1, 'hair'),
      px(0, 0, 2, 2, 'hair'), px(10, 0, 2, 2, 'hair'), px(1, 3, 2, 1, 'hair'), px(5, 3, 2, 1, 'hair'),
      px(9, 3, 2, 1, 'hair'), px(4, 1, 2, 1, 'hair-hi'), px(8, 1, 1, 1, 'clip'), px(9, 2, 1, 1, 'clip'),
      px(4, 5, 1, 2, 'ink'), px(7, 5, 1, 1, 'ink'), px(5, 8, 1, 1, 'ink'), px(6, 7, 1, 1, 'ink'),
    ],
    IDLE: [
      px(3, 0, 6, 1, 'body'), px(2, 1, 8, 1, 'body'), px(1, 2, 10, 7, 'body'), px(2, 9, 8, 1, 'body'),
      px(3, 10, 6, 1, 'body'), px(3, 0, 6, 1, 'hair'), px(2, 1, 8, 1, 'hair'), px(1, 2, 10, 1, 'hair'),
      px(0, 0, 2, 2, 'hair'), px(10, 0, 2, 2, 'hair'), px(1, 3, 2, 1, 'hair'), px(5, 3, 2, 1, 'hair'),
      px(9, 3, 2, 1, 'hair'), px(4, 1, 2, 1, 'hair-hi'), px(8, 1, 1, 1, 'clip'), px(9, 2, 1, 1, 'clip'),
      px(3, 5, 2, 1, 'ink'), px(7, 5, 2, 1, 'ink'), px(2, 7, 1, 1, 'cheek'), px(9, 7, 1, 1, 'cheek'),
      px(5, 8, 2, 1, 'ink'),
    ],
    OFFLINE: [
      px(3, 0, 6, 1, 'grey-body'), px(2, 1, 8, 1, 'grey-body'), px(1, 2, 10, 7, 'grey-body'), px(2, 9, 8, 1, 'grey-body'),
      px(3, 10, 6, 1, 'grey-body'), px(3, 0, 6, 1, 'grey-hair'), px(2, 1, 8, 1, 'grey-hair'), px(1, 2, 10, 1, 'grey-hair'),
      px(0, 0, 2, 2, 'grey-hair'), px(10, 0, 2, 2, 'grey-hair'), px(1, 3, 2, 1, 'grey-hair'), px(5, 3, 2, 1, 'grey-hair'),
      px(9, 3, 2, 1, 'grey-hair'), px(4, 1, 2, 1, 'grey-hair-hi'), px(4, 5, 1, 1, 'grey-ink'), px(7, 5, 1, 1, 'grey-ink'),
      px(5, 8, 2, 1, 'grey-ink'),
    ],
    ENDED: [
      px(3, 0, 6, 1, 'grey-body'), px(2, 1, 8, 1, 'grey-body'), px(1, 2, 10, 7, 'grey-body'), px(2, 9, 8, 1, 'grey-body'),
      px(3, 10, 6, 1, 'grey-body'), px(3, 0, 6, 1, 'grey-hair'), px(2, 1, 8, 1, 'grey-hair'), px(1, 2, 10, 1, 'grey-hair'),
      px(0, 0, 2, 2, 'grey-hair'), px(10, 0, 2, 2, 'grey-hair'), px(1, 3, 2, 1, 'grey-hair'), px(5, 3, 2, 1, 'grey-hair'),
      px(9, 3, 2, 1, 'grey-hair'), px(4, 1, 2, 1, 'grey-hair-hi'), px(3, 4, 1, 1, 'grey-ink'), px(5, 4, 1, 1, 'grey-ink'),
      px(4, 5, 1, 1, 'grey-ink'), px(3, 6, 1, 1, 'grey-ink'), px(5, 6, 1, 1, 'grey-ink'), px(6, 4, 1, 1, 'grey-ink'),
      px(8, 4, 1, 1, 'grey-ink'), px(7, 5, 1, 1, 'grey-ink'), px(6, 6, 1, 1, 'grey-ink'), px(8, 6, 1, 1, 'grey-ink'),
    ],
  },
  title: [
    px(3, 0, 6, 1, 'title-body'), px(2, 1, 8, 1, 'title-body'), px(1, 2, 10, 7, 'title-body'), px(2, 9, 8, 1, 'title-body'),
    px(3, 10, 6, 1, 'title-body'), px(3, 0, 6, 1, 'hair'), px(2, 1, 8, 1, 'hair'), px(1, 2, 10, 1, 'hair'),
    px(0, 0, 2, 2, 'hair'), px(10, 0, 2, 2, 'hair'), px(1, 3, 2, 1, 'hair'), px(5, 3, 2, 1, 'hair'),
    px(9, 3, 2, 1, 'hair'), px(4, 1, 2, 1, 'hair-hi'), px(8, 1, 1, 1, 'clip'), px(9, 2, 1, 1, 'clip'),
    px(3, 5, 1, 1, 'ink'), px(4, 4, 1, 1, 'ink'), px(5, 5, 1, 1, 'ink'), px(6, 5, 1, 1, 'ink'),
    px(7, 4, 1, 1, 'ink'), px(8, 5, 1, 1, 'ink'), px(2, 7, 1, 1, 'cheek'), px(9, 7, 1, 1, 'cheek'),
    px(5, 8, 2, 1, 'ink'),
  ],
  me: [
    px(3, 0, 6, 1, 'body'), px(2, 1, 8, 1, 'body'), px(1, 2, 10, 7, 'body'), px(2, 9, 8, 1, 'body'),
    px(3, 10, 6, 1, 'body'), px(3, 0, 6, 1, 'hair'), px(2, 1, 8, 1, 'hair'), px(1, 2, 10, 1, 'hair'),
    px(0, 0, 2, 2, 'hair'), px(10, 0, 2, 2, 'hair'), px(1, 3, 2, 1, 'hair'), px(5, 3, 2, 1, 'hair'),
    px(9, 3, 2, 1, 'hair'), px(4, 1, 2, 1, 'hair-hi'), px(8, 1, 1, 1, 'clip'), px(9, 2, 1, 1, 'clip'),
    px(3, 5, 1, 1, 'ink'), px(4, 4, 1, 1, 'ink'), px(5, 5, 1, 1, 'ink'), px(6, 5, 1, 1, 'ink'),
    px(7, 4, 1, 1, 'ink'), px(8, 5, 1, 1, 'ink'), px(2, 7, 1, 1, 'cheek'), px(9, 7, 1, 1, 'cheek'),
    px(5, 8, 2, 1, 'ink'),
  ],
  banner: [
    px(3, 0, 6, 1, 'body'), px(2, 1, 8, 1, 'body'), px(1, 2, 10, 7, 'body'), px(2, 9, 8, 1, 'body'),
    px(3, 10, 6, 1, 'body'), px(3, 0, 6, 1, 'hair'), px(2, 1, 8, 1, 'hair'), px(1, 2, 10, 1, 'hair'),
    px(0, 0, 2, 2, 'hair'), px(10, 0, 2, 2, 'hair'), px(1, 3, 2, 1, 'hair'), px(5, 3, 2, 1, 'hair'),
    px(9, 3, 2, 1, 'hair'), px(4, 1, 2, 1, 'hair-hi'), px(8, 1, 1, 1, 'clip'), px(9, 2, 1, 1, 'clip'),
    px(4, 4, 1, 3, 'ink'), px(3, 5, 3, 1, 'ink'), px(7, 4, 1, 3, 'ink'), px(6, 5, 3, 1, 'ink'),
    px(2, 7, 1, 1, 'cheek'), px(9, 7, 1, 1, 'cheek'), px(4, 8, 1, 1, 'ink'), px(7, 8, 1, 1, 'ink'),
    px(5, 9, 2, 1, 'ink'),
  ],
};
