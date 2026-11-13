// Sprites and badges: the same shape in both themes, inside the grid, colored only through tokens,
// and pixel for pixel the mockups (themes Requirements 6.1–6.5, 11.1).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DisplayState } from '../../src/core/state';
import { THEMES } from '../../src/core/theme';
import type { ThemeId } from '../../src/core/theme';
import { SPRITES, hasBadge } from '../../src/ui/sprites/render';
import type { SpriteSize, SpriteWho } from '../../src/ui/sprites/render';
import { PIXEL_ROLES } from '../../src/ui/sprites/types';
import type { Pixel } from '../../src/ui/sprites/types';
import { ROOT, hex, parseThemes } from './theme-tokens';

const STATES: DisplayState[] = ['WAITING_APPROVAL', 'WORKING', 'TURN_DONE', 'STALE', 'IDLE', 'OFFLINE', 'ENDED'];
const blocks = parseThemes();
const MOCKUPS: Record<ThemeId, { faces: string; main: string }> = {
  'blue-bot': { faces: 'FacesBot.dc.html', main: 'MainBot.dc.html' },
  'strawberry-milk': { faces: 'FacesCute.dc.html', main: 'MainCute.dc.html' },
};

type Rect = [number, number, number, number, string];
/** The `<rect>`s of every 12 × 12 SVG of a given width in a mockup, in file order. */
function mockupSprites(file: string, width: number): Rect[][] {
  const html = readFileSync(join(ROOT, 'docs/mockups', file), 'utf8');
  const out: Rect[][] = [];
  for (const m of html.matchAll(new RegExp(`<svg width="${width}" height="${width}" viewBox="0 0 12 12"[^>]*>([\\s\\S]*?)</svg>`, 'g'))) {
    out.push([...m[1]!.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" fill="(#\w+)"\/>/g)].map((r) => [+r[1]!, +r[2]!, +r[3]!, +r[4]!, r[5]!.toUpperCase()]));
  }
  return out;
}
/** A module's pixels with each role turned into its theme's color; `body` is the given agent token. */
function colored(theme: ThemeId, pixels: readonly Pixel[], bodyToken: string): Rect[] {
  return pixels.map((p) => [p.x, p.y, p.w, p.h, hex(blocks[theme], p.role === 'body' ? bodyToken : `--px-${p.role}`)]);
}

describe('sprite modules', () => {
  it('have the same shape: seven faces, a title icon and me, in both themes (Requirement 6.1)', () => {
    for (const t of THEMES) {
      expect(Object.keys(SPRITES[t].faces).sort()).toEqual([...STATES].sort());
      expect(SPRITES[t].title.length).toBeGreaterThan(0);
      expect(SPRITES[t].me.length).toBeGreaterThan(0);
    }
  });

  it('keep every rectangle inside the 12 × 12 grid and name a known role', () => {
    for (const t of THEMES) {
      const all = [...Object.values(SPRITES[t].faces).flat(), ...SPRITES[t].title, ...SPRITES[t].me];
      for (const p of all) {
        expect(p.w > 0 && p.h > 0 && p.x >= 0 && p.y >= 0 && p.x + p.w <= 12 && p.y + p.h <= 12).toBe(true);
        expect(PIXEL_ROLES).toContain(p.role);
      }
    }
  });

  it('every role but body has a --px-* token in both themes; body is set per agent', () => {
    for (const t of THEMES) for (const role of PIXEL_ROLES.filter((r) => r !== 'body')) expect(blocks[t].tokens.has(`--px-${role}`)).toBe(true);
    for (const t of THEMES) for (const a of ['claude', 'kiro', 'codex', 'me']) expect(blocks[t].tokens.has(`--agent-${a}`)).toBe(true);
  });

  it('use the grey and no agent color exactly for OFFLINE and ENDED (Requirement 6.3)', () => {
    for (const t of THEMES) {
      for (const s of STATES) {
        const roles = new Set(SPRITES[t].faces[s].map((p) => p.role));
        const grey = s === 'OFFLINE' || s === 'ENDED';
        expect([t, s, roles.has('body')]).toEqual([t, s, !grey]);
        expect([t, s, roles.has('grey-body')]).toEqual([t, s, grey]);
      }
    }
  });

  it('give every state its own face (Requirement 6.8)', () => {
    for (const t of THEMES) {
      const faces = STATES.map((s) => JSON.stringify(SPRITES[t].faces[s]));
      expect(new Set(faces).size).toBe(STATES.length);
    }
  });
});

describe('sprites equal the mockups (Requirement 6.2)', () => {
  it.each(THEMES)('%s: the seven faces of the Faces mockup, Claude-colored', (t) => {
    const faces = mockupSprites(MOCKUPS[t].faces, 40).slice(0, 7);
    expect(faces).toHaveLength(7);
    STATES.forEach((s, i) => expect([s, colored(t, SPRITES[t].faces[s], '--agent-claude')]).toEqual([s, faces[i]]));
  });

  it.each(THEMES)('%s: the title icon and me of the Main mockup', (t) => {
    expect(colored(t, SPRITES[t].title, '--px-title-body')).toEqual(mockupSprites(MOCKUPS[t].main, 20)[0]);
    expect(colored(t, SPRITES[t].me, '--agent-me')).toEqual(mockupSprites(MOCKUPS[t].main, 34)[0]);
  });
});

describe('badges (Requirement 6.5)', () => {
  const sizes: SpriteSize[] = [16, 20, 22, 26, 34, 44];
  const who: SpriteWho[] = ['claude', 'kiro', 'codex', 'me', 'title'];
  it('sit exactly on agent sprites of 26 px and more, for every state but OFFLINE', () => {
    for (const w of who) for (const s of STATES) for (const size of sizes) {
      const expected = w !== 'me' && w !== 'title' && s !== 'OFFLINE' && size >= 26;
      expect([w, s, size, hasBadge(w, s, size)]).toEqual([w, s, size, expected]);
    }
    expect(hasBadge('claude', null, 44)).toBe(false);
  });

  it('take their fill from the state colors and their glyph from tokens, in both themes', () => {
    const css = readFileSync(join(ROOT, 'src/ui/styles/sprites.css'), 'utf8');
    for (const [state, st, glyph] of [
      ['WAITING_APPROVAL', 'wait', 'wait'], ['WORKING', 'work', 'work'], ['TURN_DONE', 'done', 'done'],
      ['STALE', 'stale', 'stale'], ['IDLE', 'idle', 'idle'], ['ENDED', 'off', 'ended'],
    ]) {
      expect(css).toContain(`.badge[data-state="${state}"] { --badge-fill: var(--st-${st}); --badge-glyph: var(--badge-${glyph}); }`);
    }
    expect(css).not.toContain('.badge[data-state="OFFLINE"]');
    for (const t of THEMES) expect(blocks[t].tokens.get('--badge-work')).toBe(blocks[t].tokens.get('--glyph-work'));
  });
});
