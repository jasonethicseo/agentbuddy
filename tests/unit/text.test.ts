import { describe, expect, it } from 'vitest';
import { DEFAULT_PORT, parsePort } from '../../src/core/config';
import { codePointLength, displayName, folderName, shortId, truncate } from '../../src/core/text';

describe('truncate', () => {
  it('collapses whitespace and trims', () => {
    expect(truncate('  delete\n\thello.txt  ')).toBe('delete hello.txt');
  });

  it('keeps text of exactly 120 code points unchanged', () => {
    const s = 'a'.repeat(118) + '😀😀';
    expect(codePointLength(s)).toBe(120);
    expect(truncate(s)).toBe(s);
  });

  it('cuts to 119 code points plus an ellipsis', () => {
    const out = truncate('a'.repeat(118) + '😀😀😀');
    expect(out).toBe('a'.repeat(118) + '😀…');
    expect(codePointLength(out)).toBe(120);
  });

  it('drops a trailing space before the ellipsis', () => {
    expect(truncate('a'.repeat(118) + ' bbbb')).toBe('a'.repeat(118) + '…');
  });

  it('returns an empty string for whitespace only', () => {
    expect(truncate(' \n\t ')).toBe('');
  });
});

describe('parsePort', () => {
  it.each([
    [undefined, DEFAULT_PORT],
    ['4343', 4343],
    ['8080', 8080],
    ['65535', 65535],
    ['0', DEFAULT_PORT],
    ['65536', DEFAULT_PORT],
    ['-1', DEFAULT_PORT],
    [' 80', DEFAULT_PORT],
    ['80a', DEFAULT_PORT],
    ['1e3', DEFAULT_PORT],
    ['', DEFAULT_PORT],
  ])('parsePort(%j) = %i', (value, expected) => {
    expect(parsePort(value)).toBe(expected);
  });
});

describe('buddy names', () => {
  it('uses the last folder segment', () => {
    expect(displayName('kiro', '/Users/dev/demo')).toBe('Kiro @ demo');
    expect(displayName('claude', '/Users/dev/demo/')).toBe('Claude Code @ demo');
    expect(displayName('codex', '/Users/dev/demo')).toBe('Codex @ demo');
  });

  it('falls back to cwd when it has no segment', () => {
    expect(folderName('/')).toBe('/');
  });

  it('shortens session IDs to 8 code points', () => {
    expect(shortId('sess_ce19…')).toBe('sess_ce1');
    expect(shortId('01a1…')).toBe('01a1…');
  });
});
