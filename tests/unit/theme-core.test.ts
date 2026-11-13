// The theme IDs, and that no stored record holds a phrase string
// (themes Requirements 1.2, 1.3, 4.6; design "Phrase strings").
import { describe, expect, it } from 'vitest';
import { parseSettings, serializeSettings } from '../../src/app/settings';
import { foldInbox, pingRecord } from '../../src/core/attention';
import { DEFAULT_THEME, THEMES, THEME_NAMES, isTheme, parseTheme } from '../../src/core/theme';
import { PHRASES, SPEC_TASK_PHRASE } from '../../src/core/text';
import { T0, iso, key } from '../fixtures/views';

describe('themes', () => {
  it('are blue-bot (the default) and strawberry-milk, with names that never mention gender', () => {
    expect(THEMES).toEqual(['blue-bot', 'strawberry-milk']);
    expect(DEFAULT_THEME).toBe('blue-bot');
    expect(THEME_NAMES).toEqual({ 'blue-bot': 'Blue Bot', 'strawberry-milk': 'Strawberry Milk' });
    for (const name of Object.values(THEME_NAMES)) expect(name).not.toMatch(/\b(boy|girl|man|woman|male|female|he|she)s?\b/i);
  });

  it('isTheme accepts exactly the two IDs', () => {
    for (const t of THEMES) expect(isTheme(t)).toBe(true);
    for (const v of ['', 'Blue-Bot', 'blue-bot ', 'blue_bot', 'pink', 'strawberry', undefined, null, 1, true, ['blue-bot'], { theme: 'blue-bot' }]) {
      expect(isTheme(v)).toBe(false);
    }
  });

  it('parseTheme keeps a theme and turns anything else into the default', () => {
    expect(parseTheme('strawberry-milk')).toBe('strawberry-milk');
    expect(parseTheme('blue-bot')).toBe('blue-bot');
    for (const v of [undefined, null, '', 'STRAWBERRY-MILK', 'dark', 42, {}, []]) expect(parseTheme(v)).toBe('blue-bot');
  });
});

describe('stored records hold no phrase (themes Requirement 4.6)', () => {
  const phrases = [...Object.values(PHRASES), SPEC_TASK_PHRASE, '♪ working…', '♪ studying hard'];
  const holdsPhrase = (text: string) => phrases.some((p) => text.includes(p));

  it('inbox ping and ack records carry state, never phrase text', () => {
    for (const state of ['WAITING_APPROVAL', 'TURN_DONE'] as const) {
      const r = pingRecord(
        { session: key('kiro', 'sess_ce19…'), buddy: 'b', buddyName: 'Kiro @ demo', state, title: 'add tests', statusText: 'Created hello.txt.', startedAt: iso(T0) },
        iso(T0 + 1000),
      );
      expect(holdsPhrase(JSON.stringify(r))).toBe(false);
      expect(Object.keys(r).sort()).toEqual(['at', 'buddyName', 'session', 'startedAt', 'state', 't', 'title']);
      expect(foldInbox([r])[0]!.state).toBe(state);
    }
  });

  it('the settings file holds no phrase', () => {
    expect(holdsPhrase(serializeSettings(parseSettings({ myStatus: 'brb', closedGroups: ['/Users/dev/demo'] })))).toBe(false);
  });
});
