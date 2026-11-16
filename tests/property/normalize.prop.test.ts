// P1: normalize never throws and returns null or a valid event (Requirements 5.1–5.3, 6.1),
// and keeps launcher fields exactly when well-formed (messenger-app Requirements 1.2–1.4).
// P2: Codex title turns, suggestions turns and suggestion safety checks are dropped whichever signal is present (Requirements 4.2–4.4; events.md traps 1, 7, 8).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { TEXT_LIMIT } from '../../src/core/config';
import { validateEvent } from '../../src/core/event';
import type { AgentId, BuddyEvent } from '../../src/core/event';
import { isBundleId, isTermProgram } from '../../src/core/launcher';
import { CODEX_SAFETY_PREFIX, CODEX_TITLE_PREFIX, normalize } from '../../src/core/normalize';
import { codePointLength } from '../../src/core/text';

const AT = '2026-11-12T01:02:03.456Z';
const agent = fc.constantFrom<AgentId>('kiro', 'claude', 'codex');

const longText = fc.oneof(fc.string(), fc.string({ unit: 'binary', maxLength: 400, size: 'max' }));
const anyField = fc.oneof(longText, fc.jsonValue({ maxDepth: 2 }), fc.constant(''), fc.constant(' \n '));

// Payloads close to the real ones, with every field optional and any value,
// so that many of them normalize to real events.
const nearPayload = fc.record(
  {
    hook_event_name: fc.oneof(
      fc.constantFrom('UserPromptSubmit', 'PreTaskExec', 'PostTaskExec', 'Stop', 'Notification', 'PreToolUse'),
      fc.string(),
    ),
    type: fc.oneof(fc.constant('agent-turn-complete'), fc.string()),
    session_id: fc.oneof(fc.constantFrom('sess_0bcd…', 'e697…'), anyField),
    'thread-id': fc.oneof(fc.constant('01a1…'), anyField),
    cwd: fc.oneof(fc.constant('/Users/dev/demo'), anyField),
    prompt: anyField,
    task_name: anyField,
    spec_name: fc.oneof(fc.constant('/Users/dev/demo/.kiro/specs/a/tasks.md'), anyField),
    task_success: anyField,
    notification_type: fc.oneof(fc.constantFrom('permission_prompt', 'idle_prompt'), anyField),
    last_assistant_message: anyField,
    'last-assistant-message': anyField,
    'input-messages': fc.oneof(fc.array(longText, { maxLength: 4 }), anyField),
  },
  { requiredKeys: [] },
);

const rawInput = fc.oneof(
  fc.string({ unit: 'binary', maxLength: 200 }),
  fc.json({ maxDepth: 3 }),
  nearPayload.map((p) => JSON.stringify(p)),
);

// Environment values as the hook would pass them: observed ones, near misses and anything.
const envValue = fc.option(
  fc.oneof(
    fc.constantFrom('com.microsoft.VSCode', 'dev.kiro.desktop', 'com.apple.Terminal', 'vscode', 'Apple_Terminal', 'tmux'),
    fc.constantFrom('', ' ', 'com.', '-b.x', 'com.x;id', 'vs code', 'a'.repeat(300)),
    fc.string({ unit: 'binary', maxLength: 80 }),
  ),
  { nil: undefined },
);
const launcherEnv = fc.record({ bundleId: envValue, termProgram: envValue });

function checkOutput(out: BuddyEvent | null) {
  if (out === null) return;
  expect(validateEvent(out)).toEqual(out);
  if (out.text !== undefined) expect(codePointLength(out.text)).toBeLessThanOrEqual(TEXT_LIMIT);
  if (out.task !== undefined) expect(codePointLength(out.task.name)).toBeLessThanOrEqual(TEXT_LIMIT);
  if (out.firstInput !== undefined) {
    expect(codePointLength(out.firstInput)).toBeLessThanOrEqual(TEXT_LIMIT);
    expect([out.agent, out.kind]).toEqual(['codex', 'stop']);
  }
}

describe('P1 normalize', () => {
  it('never throws and returns null or a valid BuddyEvent', () => {
    fc.assert(
      fc.property(agent, rawInput, (a, raw) => {
        checkOutput(normalize(a, raw, AT));
      }),
      { numRuns: 1000 },
    );
  });

  it('with any launcher environment, keeps each launcher field exactly when it is well-formed', () => {
    let withLauncher = 0;
    fc.assert(
      fc.property(agent, nearPayload, launcherEnv, (a, p, env) => {
        const raw = JSON.stringify(p);
        const out = normalize(a, raw, AT, env);
        checkOutput(out);
        // The environment never decides whether an event is kept.
        expect(out === null).toBe(normalize(a, raw, AT) === null);
        if (out === null) return;
        expect(out.bundleId).toBe(isBundleId(env.bundleId) ? env.bundleId : undefined);
        expect(out.termProgram).toBe(isTermProgram(env.termProgram) ? env.termProgram : undefined);
        if (out.bundleId !== undefined || out.termProgram !== undefined) withLauncher++;
      }),
      { numRuns: 1000 },
    );
    expect(withLauncher).toBeGreaterThan(10);
  });

  it('produces real events for near-real payloads (generator sanity check)', () => {
    let produced = 0;
    fc.assert(
      fc.property(agent, nearPayload, (a, p) => {
        if (normalize(a, JSON.stringify(p), AT) !== null) produced++;
      }),
      { numRuns: 1000 },
    );
    expect(produced).toBeGreaterThan(20);
  });
});

describe('P2 Codex title turns', () => {
  const titleMessage = fc
    .tuple(fc.constantFrom('', ' ', '\n  '), fc.string({ maxLength: 80 }))
    .map(([lead, rest]) => `${lead}${CODEX_TITLE_PREFIX}${rest}`);
  const titleReply = fc
    .tuple(fc.constantFrom('', ' ', '\n'), fc.string({ maxLength: 40 }), fc.dictionary(fc.string(), fc.jsonValue({ maxDepth: 1 }), { maxKeys: 3 }))
    .map(([pad, title, others]) => `${pad}${JSON.stringify({ ...others, title })}${pad}`);
  const otherMessages = fc.array(fc.string({ maxLength: 40 }), { maxLength: 3 });
  const anyReply = fc.oneof(fc.string({ maxLength: 80 }), fc.jsonValue({ maxDepth: 1 }));

  const signals = fc.constantFrom('message', 'reply', 'both');

  it('drops the event if either signal is present', () => {
    fc.assert(
      fc.property(signals, titleMessage, titleReply, otherMessages, anyReply, (which, msg, reply, before, plainReply) => {
        const payload = {
          type: 'agent-turn-complete',
          'thread-id': '01a1…',
          'turn-id': '01a1…',
          cwd: '/Users/dev/demo',
          client: 'codex-tui',
          'input-messages': which === 'reply' ? [...before, 'run ls'] : [...before, msg],
          'last-assistant-message': which === 'message' ? plainReply : reply,
        };
        expect(normalize('codex', JSON.stringify(payload), AT)).toBeNull();
      }),
      { numRuns: 500 },
    );
  });
});
describe('P2b Codex suggestions turns (trap 7, seen 2026-11-13)', () => {
  const suggestionsMessage = fc
    .tuple(fc.constantFrom('', ' ', '\n'), fc.constantFrom('\n', ' ', '\n\n'), fc.string({ maxLength: 80 }))
    .map(([lead, gap, rest]) => `${lead}# Overview${gap}Generate 0 to 3 hyperpersonalized suggestions${rest}`);
  const suggestionsReply = fc
    .tuple(fc.constantFrom('', ' ', '\n'), fc.array(fc.string({ maxLength: 20 }), { maxLength: 3 }))
    .map(([pad, items]) => `${pad}${JSON.stringify({ suggestions: items })}${pad}`);
  const otherMessages = fc.array(fc.string({ maxLength: 40 }), { maxLength: 3 });
  const anyReply = fc.string({ maxLength: 80 }).filter((s) => !s.includes('suggestions'));
  it('drops the event if either signal is present', () => {
    fc.assert(
      fc.property(fc.constantFrom('message', 'reply', 'both'), suggestionsMessage, suggestionsReply, otherMessages, anyReply, (which, msg, reply, before, plainReply) => {
        const payload = {
          type: 'agent-turn-complete',
          'thread-id': '01a1…',
          'turn-id': '01a1…',
          cwd: '/',
          'input-messages': which === 'reply' ? [...before, 'run ls'] : [...before, msg],
          'last-assistant-message': which === 'message' ? plainReply : reply,
        };
        expect(normalize('codex', JSON.stringify(payload), AT)).toBeNull();
      }),
      { numRuns: 500 },
    );
  });
  it('keeps a normal turn whose reply only mentions suggestions in text', () => {
    const payload = { type: 'agent-turn-complete', 'thread-id': '01a1…', cwd: '/Users/dev/demo', 'input-messages': ['any ideas?'], 'last-assistant-message': 'Here are some suggestions.' };
    expect(normalize('codex', JSON.stringify(payload), AT)).not.toBeNull();
  });
});

describe('P2c Codex suggestion safety checks (trap 8, seen 2026-11-15 and 2026-11-16)', () => {
  const safetyMessage = fc
    .tuple(fc.constantFrom('', ' ', '\n'), fc.string({ maxLength: 80 }))
    .map(([lead, rest]) => `${lead}${CODEX_SAFETY_PREFIX}${rest}`);
  const safetyReply = fc
    .tuple(fc.constantFrom('', ' ', '\n'), fc.array(fc.string({ maxLength: 20 }), { maxLength: 3 }))
    .map(([pad, items]) => `${pad}${JSON.stringify({ exclude: items })}${pad}`);
  const otherMessages = fc.array(fc.string({ maxLength: 40 }), { maxLength: 3 });
  const anyReply = fc.string({ maxLength: 80 }).filter((s) => !s.includes('exclude'));
  it('drops the event if either signal is present', () => {
    fc.assert(
      fc.property(fc.constantFrom('message', 'reply', 'both'), safetyMessage, safetyReply, otherMessages, anyReply, (which, msg, reply, before, plainReply) => {
        const payload = {
          type: 'agent-turn-complete',
          'thread-id': '01a1…',
          'turn-id': '01a1…',
          cwd: '/',
          'input-messages': which === 'reply' ? [...before, 'run ls'] : [...before, msg],
          'last-assistant-message': which === 'message' ? plainReply : reply,
        };
        expect(normalize('codex', JSON.stringify(payload), AT)).toBeNull();
      }),
      { numRuns: 500 },
    );
  });
  it('keeps a normal turn whose reply only mentions exclude in text, or whose earlier message quotes the template', () => {
    const base = { type: 'agent-turn-complete', 'thread-id': '01a1…', cwd: '/Users/dev/demo' };
    const text = { ...base, 'input-messages': ['what does exclude do?'], 'last-assistant-message': 'It leaves files out: exclude = ["dist"].' };
    const quoted = { ...base, 'input-messages': [CODEX_SAFETY_PREFIX, 'thanks'], 'last-assistant-message': 'Done.' };
    expect(normalize('codex', JSON.stringify(text), AT)).not.toBeNull();
    expect(normalize('codex', JSON.stringify(quoted), AT)).not.toBeNull();
  });
});
