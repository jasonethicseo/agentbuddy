// Status lines: phrases per state, the excerpt, hide-text and the Kiro spec-task phrase
// (messenger-app Requirements 7.1–7.4).
import { describe, expect, it } from 'vitest';
import type { DisplayState } from '../../src/core/state';
import { PHRASES, SPEC_TASK_PHRASE, statusLine, statusParts } from '../../src/core/text';

describe('status phrases', () => {
  it.each([
    ['WAITING_APPROVAL', 'need your OK T_T'],
    ['WORKING', '♪ working…'],
    ['STALE', '? no news for a while'],
    ['TURN_DONE', '★ done~ your turn!'],
    ['IDLE', 'brb~ zZ'],
    ['OFFLINE', 'offline'],
    ['ENDED', 'logged off'],
  ] as [DisplayState, string][])('%s reads %s', (state, phrase) => {
    expect(PHRASES[state]).toBe(phrase);
    expect(statusParts(state, false, undefined, false)).toEqual({ phrase });
  });

  it('uses ♪ studying hard only for a working Kiro session in a spec task', () => {
    expect(statusParts('WORKING', true, '16. Kiro progress', false)).toEqual({ phrase: SPEC_TASK_PHRASE, excerpt: '16. Kiro progress' });
    expect(statusParts('TURN_DONE', true, '16. Kiro progress', false).phrase).toBe('★ done~ your turn!');
    expect(statusParts('STALE', true, undefined, false).phrase).toBe('? no news for a while');
  });

  it('contains no emoji', () => {
    for (const p of [...Object.values(PHRASES), SPEC_TASK_PHRASE]) expect(p).not.toMatch(/\p{Extended_Pictographic}(?<![★♪])/u);
  });
});

describe('status excerpt', () => {
  it('follows the phrase after · and is cut to 40 code points', () => {
    const parts = statusParts('WAITING_APPROVAL', false, '  delete\n hello.txt?  ', false);
    expect(parts).toEqual({ phrase: 'need your OK T_T', excerpt: 'delete hello.txt?' });
    expect(statusLine(parts)).toBe('need your OK T_T · delete hello.txt?');
    const long = statusParts('TURN_DONE', false, 'a'.repeat(100), false);
    expect(long.excerpt).toBe(`${'a'.repeat(39)}…`);
  });

  it('is left out with hide-text on, and for blank text', () => {
    expect(statusParts('TURN_DONE', false, 'Created hello.txt.', true)).toEqual({ phrase: '★ done~ your turn!' });
    expect(statusLine(statusParts('TURN_DONE', false, 'Created hello.txt.', true))).toBe('★ done~ your turn!');
    expect(statusParts('TURN_DONE', false, ' \n ', false)).toEqual({ phrase: '★ done~ your turn!' });
  });
});
