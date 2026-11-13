// Sprites, badges and pixel icons: the same shape in both skins, inside the grid, colored only through tokens,
// and pixel for pixel the mockups (themes Requirements 6.1–6.5, 11.1; retro-skin Requirements 4, 14.1).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DisplayState } from '../../src/core/state';
import { THEMES } from '../../src/core/theme';
import type { ThemeId } from '../../src/core/theme';
import { SPRITES, STATE_NAMES, hasBadge } from '../../src/ui/sprites/render';
import type { SpriteSize, SpriteWho } from '../../src/ui/sprites/render';
import { ICONS } from '../../src/ui/sprites/icons';
import type { IconName } from '../../src/ui/sprites/icons';
import { PIXEL_ROLES } from '../../src/ui/sprites/types';
import type { Pixel } from '../../src/ui/sprites/types';
import { ROOT, hex, parseThemes } from './theme-tokens';

const STATES: DisplayState[] = ['WAITING_APPROVAL', 'WORKING', 'TURN_DONE', 'STALE', 'IDLE', 'OFFLINE', 'ENDED'];
const blocks = parseThemes();
const MOCKUPS: Record<ThemeId, { faces: string; main: string }> = {
  'blue-bot': { faces: 'FacesBot.dc.html', main: 'MainBot2000.dc.html' },
  'strawberry-milk': { faces: 'FacesCute2000.dc.html', main: 'MainCute2000.dc.html' },
};
type Rect = [number, number, number, number, string];
/** The `<rect>`s of every SVG of a given width and grid in a mockup, in file order. */
function mockupSprites(file: string, width: number, grid = 12): Rect[][] {
  const html = readFileSync(join(ROOT, 'docs/mockups', file), 'utf8');
  const out: Rect[][] = [];
  for (const m of html.matchAll(new RegExp(`<svg width="${width}" height="${width}" viewBox="0 0 ${grid} ${grid}"[^>]*>([\\s\\S]*?)</svg>`, 'g'))) {
    out.push([...m[1]!.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" fill="(#\w+)"\/>/g)].map((r) => [+r[1]!, +r[2]!, +r[3]!, +r[4]!, r[5]!.toUpperCase()]));
  }
  return out;
}
/** A module's pixels with each role turned into its theme's color; `body` is the given agent token. */
function colored(theme: ThemeId, pixels: readonly Pixel[], bodyToken: string): Rect[] {
  return pixels.map((p) => [p.x, p.y, p.w, p.h, hex(blocks[theme], p.role === 'body' ? bodyToken : `--px-${p.role}`)]);
}

describe('sprite modules', () => {
  it('have the same shape: seven faces, a title icon, me and the banner mascot, in both skins (Requirement 6.1)', () => {
    for (const t of THEMES) {
      expect(Object.keys(SPRITES[t].faces).sort()).toEqual([...STATES].sort());
      expect(Object.keys(SPRITES[t]).sort()).toEqual(['banner', 'faces', 'me', 'title']);
      for (const part of [SPRITES[t].title, SPRITES[t].me, SPRITES[t].banner]) expect(part.length).toBeGreaterThan(0);
    }
  });

  it('keep every rectangle inside the 12 × 12 grid and name a known role', () => {
    for (const t of THEMES) {
      const all = [...Object.values(SPRITES[t].faces).flat(), ...SPRITES[t].title, ...SPRITES[t].me, ...SPRITES[t].banner];
      for (const p of all) {
        expect(p.w > 0 && p.h > 0 && p.x >= 0 && p.y >= 0 && p.x + p.w <= 12 && p.y + p.h <= 12).toBe(true);
        expect(PIXEL_ROLES).toContain(p.role);
      }
    }
  });

  it('every role but body has a --px-* token in both themes; body is set per agent', () => {
    for (const t of THEMES) for (const role of PIXEL_ROLES.filter((r) => r !== 'body')) expect(blocks[t].tokens.has(`--px-${role}`)).toBe(true);
    for (const t of THEMES) for (const a of ['claude', 'kiro', 'codex', 'me', 'banner']) expect(blocks[t].tokens.has(`--agent-${a}`)).toBe(true);
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

  it.each(THEMES)('%s: the title icon, me and the banner mascot of the Main 2000 mockup', (t) => {
    expect(colored(t, SPRITES[t].title, '--px-title-body')).toEqual(mockupSprites(MOCKUPS[t].main, 16)[0]);
    expect(colored(t, SPRITES[t].me, '--agent-me')).toEqual(mockupSprites(MOCKUPS[t].main, 36)[0]);
    expect(colored(t, SPRITES[t].banner, '--agent-banner')).toEqual(mockupSprites(MOCKUPS[t].main, 28)[0]);
  });
  it('Strawberry Milk buddies have hair, and grey hair without the clip when offline or ended (Requirement 4.1)', () => {
    for (const s of STATES) {
      const roles = new Set(SPRITES['strawberry-milk'].faces[s].map((p) => p.role));
      const grey = s === 'OFFLINE' || s === 'ENDED';
      expect([s, roles.has('hair'), roles.has('clip'), roles.has('grey-hair')]).toEqual([s, !grey, !grey, grey]);
    }
    for (const role of ['hair', 'hair-hi', 'clip', 'grey-hair', 'grey-hair-hi']) expect(blocks['blue-bot'].tokens.get(`--px-${role}`)).toBe('transparent');
  });
  it('the turn-done smile of brief 4', () => {
    const face = SPRITES['strawberry-milk'].faces.TURN_DONE.filter((p) => p.role === 'ink' && p.y >= 8).map((p) => [p.x, p.y, p.w, p.h]);
    expect(face).toEqual([[4, 8, 1, 1], [7, 8, 1, 1], [5, 9, 2, 1]]);
  });
});

describe('state names', () => {
  it('name every state for screen readers, next to every sprite (messenger-app Requirement 6.13)', () => {
    expect(STATE_NAMES).toEqual({
      WAITING_APPROVAL: 'waiting for approval', WORKING: 'working', TURN_DONE: 'turn done', STALE: 'no news',
      IDLE: 'idle', OFFLINE: 'offline', ENDED: 'logged off',
    });
  });
});

describe('badges (retro-skin Requirement 4.4, S10)', () => {
  const sizes: SpriteSize[] = [12, 16, 24, 28, 36];
  const who: SpriteWho[] = ['claude', 'kiro', 'codex', 'me', 'title', 'banner'];
  it('sit exactly on agent sprites of 24 px and more, for every state but OFFLINE', () => {
    for (const w of who) for (const s of STATES) for (const size of sizes) {
      const expected = w !== 'me' && w !== 'title' && w !== 'banner' && s !== 'OFFLINE' && size >= 24;
      expect([w, s, size, hasBadge(w, s, size)]).toEqual([w, s, size, expected]);
    }
    expect(hasBadge('claude', null, 36)).toBe(false);
  });
  it('by place: buddy rows (24), inbox rows (24) and pop-ups (36) have them; session rows (12), tiles (16), me and title do not', () => {
    const calls = (file: string) => [...readFileSync(join(ROOT, 'src/ui', file), 'utf8').matchAll(/(?:stateSprite|sprite)\([\w!.]+, ([^,]+), [^,]+, (\d+)\)/g)].map((m) => [m[1], +m[2]!]);
    expect(calls('screens/list.ts')).toEqual([['agent', 12], ['vm.agent', 24]]);
    expect(calls('screens/inbox.ts')).toEqual([['r.agentId', 24]]);
    expect(calls('screens/popup.ts')).toEqual([['c.agentId', 36]]);
    expect(calls('screens/settings.ts')).toEqual([["'claude'", 16]]);
    expect(calls('screens/me.ts')).toEqual([["'me'", 36]]);
    expect(calls('chrome.ts')).toEqual([["'title'", 16]]);
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
describe('pixel icons (retro-skin Requirements 4.5, 4.6, 4.8)', () => {
  const ROLE_TOKEN: Record<string, string> = {
    'berry-leaf': '--px-berry-leaf', 'berry-red': '--px-berry-red', 'berry-seed': '--px-berry-seed', 'icon-1': '--icon-1',
    'icon-2': '--icon-2', 'icon-paper': '--icon-paper', 'icon-swatch-a': '--icon-swatch-a', 'icon-swatch-b': '--icon-swatch-b', 'icon-frame': '--icon-frame',
  };
  const iconRects = (t: ThemeId, name: IconName): Rect[] => ICONS[name].rects.map((p) => [p.x, p.y, p.w, p.h, hex(blocks[t], ROLE_TOKEN[p.role]!)]);
  it('the strawberry equals the mockup in Strawberry Milk', () => {
    expect(iconRects('strawberry-milk', 'berry')).toEqual(mockupSprites('MainCute2000.dc.html', 12, 8)[0]);
  });
  it.each(THEMES)('%s: the four toolbar icons equal the mockup', (t) => {
    const mock = mockupSprites(MOCKUPS[t].main, 16, 8);
    expect([iconRects(t, 'tool-buddies'), iconRects(t, 'tool-inbox'), iconRects(t, 'tool-settings'), iconRects(t, 'tool-skin')]).toEqual(mock.slice(0, 4));
  });
  it('keep every rectangle inside their grid; the drawn icons equal design.md', () => {
    for (const def of Object.values(ICONS)) for (const p of def.rects) expect(p.x >= 0 && p.y >= 0 && p.x + p.w <= def.grid && p.y + p.h <= def.grid).toBe(true);
    const design = readFileSync(join(ROOT, '.kiro/steering/design.md'), 'utf8');
    const listed = (name: IconName) => ICONS[name].rects.filter((p) => p.role === 'ink').map((p) => `(${p.x},${p.y},${p.w},${p.h})`).join(' ');
    expect(design).toContain(`(7 × 7; the \`TURN_DONE\` badge glyph and \`on top ✓\` in the status bar): \`${listed('check')}\``);
    expect(design).toContain(`(7 × 7; the \`✎\` after the status message): \`${listed('pencil')}\``);
  });
  it('every icon role has a token in both skins; the berry is transparent in Blue Bot', () => {
    for (const t of THEMES) for (const tok of [...Object.values(ROLE_TOKEN), '--tree-box', '--tree-box-bg']) expect(blocks[t].tokens.has(tok)).toBe(true);
    for (const r of ['leaf', 'red', 'seed']) expect(blocks['blue-bot'].tokens.get(`--px-berry-${r}`)).toBe('transparent');
  });
});
