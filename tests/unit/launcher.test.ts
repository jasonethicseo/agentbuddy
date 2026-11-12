// Launcher fields: forms, validation, normalization and the session view (Requirements 1.1–1.8, 17.1).
import { describe, expect, it } from 'vitest';
import { applyEvent, toViews } from '../../src/core/buddies';
import type { SessionList } from '../../src/core/buddies';
import { validateEvent } from '../../src/core/event';
import type { BuddyEvent } from '../../src/core/event';
import { isBundleId, isTermProgram, launcherFields } from '../../src/core/launcher';
import { normalize } from '../../src/core/normalize';
import { FIXTURES } from '../fixtures/payloads';

const AT = '2026-11-12T01:02:03.456Z';
const fixture = (id: string) => FIXTURES.find((f) => f.id === id)!.raw;

// Values recorded in events.md ("Launcher values seen so far") and public app IDs from O2.
const OBSERVED_BUNDLE_IDS = [
  'com.anthropic.claudefordesktop',
  'com.microsoft.VSCode',
  'dev.kiro.desktop',
  'com.apple.Terminal',
  'com.openai.codex',
  'com.googlecode.iterm2',
];
const OBSERVED_TERM_PROGRAMS = ['vscode', 'kiro', 'Apple_Terminal', 'tmux'];

describe('isBundleId', () => {
  it.each(OBSERVED_BUNDLE_IDS)('accepts the observed value %s', (id) => {
    expect(isBundleId(id)).toBe(true);
  });

  it('accepts digits and hyphens inside labels', () => {
    expect(isBundleId('com.todesktop.230313mzl4w4u92')).toBe(true);
    expect(isBundleId('org.example.my-app')).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['one label', 'kiro'],
    ['trailing dot', 'com.'],
    ['leading dot', '.com.example'],
    ['leading hyphen', '-b.example'],
    ['label starting with a hyphen', 'com.-x'],
    ['empty label', 'com..example'],
    ['space', 'com.example app'],
    ['trailing space', 'com.example '],
    ['trailing newline', 'com.example\n'],
    ['semicolon', 'com.example;rm'],
    ['equals', 'com.example=1'],
    ['command substitution', '$(id).example'],
    ['quote', 'com."example"'],
    ['slash', 'com/example.app'],
    ['underscore', 'com.my_app'],
    ['non-ASCII', 'com.예제.app'],
  ])('rejects %s', (_label, id) => {
    expect(isBundleId(id)).toBe(false);
  });

  it('rejects values over 255 characters and non-strings', () => {
    const at255 = `${'a'.repeat(126)}.${'b'.repeat(128)}`;
    expect(at255).toHaveLength(255);
    expect(isBundleId(at255)).toBe(true);
    expect(isBundleId(`${at255}c`)).toBe(false);
    for (const v of [undefined, null, 7, ['com.example'], { id: 'com.example' }]) expect(isBundleId(v)).toBe(false);
  });
});

describe('isTermProgram', () => {
  it.each(OBSERVED_TERM_PROGRAMS)('accepts the observed value %s', (v) => {
    expect(isTermProgram(v)).toBe(true);
  });

  it('accepts dots, plus signs and 64 characters', () => {
    expect(isTermProgram('iTerm.app')).toBe(true);
    expect(isTermProgram('a+b')).toBe(true);
    expect(isTermProgram('a'.repeat(64))).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['too long', 'a'.repeat(65)],
    ['leading space', ' vscode'],
    ['space', 'vs code'],
    ['leading hyphen', '-x'],
    ['leading dot', '.x'],
    ['semicolon', 'x;y'],
    ['dollar', 'x$y'],
    ['newline', 'vscode\n'],
  ])('rejects %s', (_label, v) => {
    expect(isTermProgram(v)).toBe(false);
  });
});

describe('launcherFields', () => {
  it('keeps well-formed values and leaves out missing or malformed ones', () => {
    expect(launcherFields({ bundleId: 'com.microsoft.VSCode', termProgram: 'vscode' })).toEqual({
      bundleId: 'com.microsoft.VSCode',
      termProgram: 'vscode',
    });
    expect(launcherFields({ bundleId: 'dev.kiro.desktop' })).toEqual({ bundleId: 'dev.kiro.desktop' });
    expect(launcherFields({ bundleId: 'bad id', termProgram: 'tmux' })).toEqual({ termProgram: 'tmux' });
    expect(launcherFields({})).toEqual({});
  });
});

describe('validateEvent with launcher fields', () => {
  const base = { v: 1, session: 's1', kind: 'stop', at: AT, cwd: '/Users/dev/demo' } as const;

  it.each(['kiro', 'claude', 'codex'] as const)('keeps both fields on %s events', (agent) => {
    const e = { ...base, agent, bundleId: 'com.apple.Terminal', termProgram: 'Apple_Terminal' };
    expect(validateEvent(e)).toEqual(e);
  });

  it('rejects an event whose present field is malformed', () => {
    expect(validateEvent({ ...base, agent: 'kiro', bundleId: 'kiro' })).toBeNull();
    expect(validateEvent({ ...base, agent: 'kiro', bundleId: '' })).toBeNull();
    expect(validateEvent({ ...base, agent: 'kiro', termProgram: 'vs code' })).toBeNull();
    expect(validateEvent({ ...base, agent: 'kiro', termProgram: 3 })).toBeNull();
  });
});

describe('normalize with launcher values from the hook environment', () => {
  const env = { bundleId: 'com.microsoft.VSCode', termProgram: 'vscode' };

  it.each([
    ['kiro', 'kiro-user-prompt-submit'],
    ['claude', 'claude-stop'],
  ] as const)('sets both fields on %s events', (agent, id) => {
    expect(normalize(agent, fixture(id), AT, env)).toMatchObject(env);
  });

  it('sets both fields on Codex events', () => {
    expect(normalize('codex', fixture('codex-turn-complete'), AT, env)).toMatchObject(env);
  });

  it('keeps the event and leaves out a malformed value', () => {
    const out = normalize('kiro', fixture('kiro-stop'), AT, { bundleId: 'com.x;rm -rf', termProgram: 'kiro' });
    expect(out).not.toBeNull();
    expect(out).not.toHaveProperty('bundleId');
    expect(out?.termProgram).toBe('kiro');
  });

  it('adds nothing when the variables are unset', () => {
    const out = normalize('kiro', fixture('kiro-stop'), AT, { bundleId: undefined, termProgram: undefined });
    expect(out).not.toHaveProperty('bundleId');
    expect(out).not.toHaveProperty('termProgram');
  });

  it('still drops a Codex title turn', () => {
    expect(normalize('codex', fixture('codex-title-turn'), AT, env)).toBeNull();
  });
});

describe('session launcher in the view', () => {
  const ev = (sec: number, kind: BuddyEvent['kind'], extra: Partial<BuddyEvent> = {}): BuddyEvent => ({
    v: 1,
    agent: 'claude',
    session: 'e697…',
    kind,
    at: new Date(Date.parse(AT) + sec * 1000).toISOString(),
    cwd: '/Users/dev/demo',
    ...extra,
  });
  const viewOf = (events: BuddyEvent[]) => {
    let list: SessionList = new Map();
    events.forEach((e, i) => (list = applyEvent(list, e, i + 1).list));
    return toViews(list, new Map(), Date.parse(AT) + 60_000)[0]!.sessions[0]!;
  };

  it('comes from the latest event in event order that carries a field, taken as a pair', () => {
    const view = viewOf([
      ev(10, 'prompt', { bundleId: 'dev.kiro.desktop', termProgram: 'kiro' }),
      ev(5, 'prompt', { bundleId: 'com.microsoft.VSCode', termProgram: 'vscode' }), // late, but earlier in event order
      ev(20, 'stop'), // no launcher: keeps the kept one
    ]);
    expect(view.bundleId).toBe('dev.kiro.desktop');
    expect(view.termProgram).toBe('kiro');
  });

  it('is absent for sessions whose events carry no launcher (logs from before this spec)', () => {
    const view = viewOf([ev(1, 'prompt'), ev(2, 'stop')]);
    expect(view).not.toHaveProperty('bundleId');
    expect(view).not.toHaveProperty('termProgram');
  });

  it('takes the fields together: a later event with only termProgram drops the older bundleId', () => {
    const view = viewOf([ev(1, 'prompt', { bundleId: 'com.microsoft.VSCode', termProgram: 'vscode' }), ev(2, 'stop', { termProgram: 'tmux' })]);
    expect(view.termProgram).toBe('tmux');
    expect(view).not.toHaveProperty('bundleId');
  });
});
