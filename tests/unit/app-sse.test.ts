// The app's stream reader: SSE parsing and the BuddyView check (messenger-app Requirements 4.5, 17.1).
import { describe, expect, it } from 'vitest';
import { applyEvent, toViews } from '../../src/core/buddies';
import type { SessionList } from '../../src/core/buddies';
import type { BuddyEvent } from '../../src/core/event';
import { createSseParser, parseViews } from '../../src/app/sse';
import type { SseMessage } from '../../src/app/sse';

function collect(maxChars?: number) {
  const got: SseMessage[] = [];
  const parser = createSseParser((m) => got.push(m), maxChars);
  return { got, push: (s: string) => parser.push(s) };
}

describe('createSseParser', () => {
  it('reads the relay format: event and data lines, a blank line, and heartbeat comments', () => {
    const p = collect();
    p.push(': ping\n\nevent: buddies\ndata: []\n\n: ping\n\n');
    expect(p.got).toEqual([{ event: 'buddies', data: '[]' }]);
  });

  it('joins messages split at any point across chunks, including inside \\r\\n', () => {
    const text = 'event: buddies\r\ndata: [1,\r\ndata: 2]\r\n\r\nevent: buddies\ndata: []\n\n';
    for (let cut = 0; cut <= text.length; cut++) {
      const p = collect();
      p.push(text.slice(0, cut));
      p.push(text.slice(cut));
      expect(p.got).toEqual([{ event: 'buddies', data: '[1,\n2]' }, { event: 'buddies', data: '[]' }]);
    }
  });

  it('calls a message without an event line "message", and waits for the blank line', () => {
    const p = collect();
    p.push('data: x\n');
    expect(p.got).toEqual([]);
    p.push('\n');
    expect(p.got).toEqual([{ event: 'message', data: 'x' }]);
  });

  it('skips a message over the size cap and goes on with the next one', () => {
    const p = collect(100);
    p.push(`event: buddies\ndata: ${'x'.repeat(200)}\n\nevent: buddies\ndata: []\n\n`);
    expect(p.got).toEqual([{ event: 'buddies', data: '[]' }]);
    const q = collect(100);
    q.push('x'.repeat(150)); // a line that never ends
    q.push('\n\nevent: buddies\ndata: ok\n\n');
    expect(q.got).toEqual([{ event: 'buddies', data: 'ok' }]);
  });
});

describe('parseViews', () => {
  const at = '2026-11-12T05:00:00.000Z';
  const session = { key: '["claude","e697…"]', session: 'e697…', state: 'WAITING_APPROVAL', lastAt: at, startedAt: at, title: 'fix login' };
  const buddy = { key: '["claude","/Users/dev/demo"]', agent: 'claude', name: 'Claude Code @ demo', cwd: '/Users/dev/demo', state: 'WAITING_APPROVAL', lastAt: at, sessions: [session] };

  it('accepts a list exactly as the relay builds it, with launcher and spec-task fields', () => {
    const events: BuddyEvent[] = [
      { v: 1, agent: 'kiro', session: 'sess_0bcd…', kind: 'task_start', at, cwd: '/Users/dev/demo', task: { name: '2. Change', specPath: '/Users/dev/demo/.kiro/specs/a/tasks.md' }, bundleId: 'dev.kiro.desktop' },
      { v: 1, agent: 'claude', session: 'e697…', kind: 'permission', at, cwd: '/Users/dev/demo', bundleId: 'com.anthropic.claudefordesktop' },
      { v: 1, agent: 'claude', session: 'aba1…', kind: 'end', at, cwd: '/Users/dev/demo' },
    ];
    let list: SessionList = new Map();
    events.forEach((e, i) => (list = applyEvent(list, e, i + 1).list));
    const views = toViews(list, new Map([['["kiro","/Users/dev/demo"]', { done: 3, total: 5 }]]), Date.parse(at) + 1000);
    expect(parseViews(JSON.stringify(views))).toEqual(views);
  });

  it('accepts a core-pipeline relay list (no launcher, no ENDED)', () => {
    expect(parseViews(JSON.stringify([buddy]))).toEqual([buddy]);
  });

  it('returns null for text that is not a JSON array', () => {
    for (const t of ['', 'not json', '{}', 'null', '"x"']) expect(parseViews(t)).toBeNull();
  });

  it('drops malformed sessions and buddies, and unknown or malformed fields', () => {
    const bad = [
      { ...buddy, sessions: [session, { ...session, state: 'HAPPY' }, { ...session, key: 7 }, null] },
      { ...buddy, agent: 'cursor' },
      { ...buddy, sessions: [] },
      { ...buddy, sessions: [{ ...session, bundleId: 'com.x; rm', termProgram: 'vs code', task: 'yes', extra: 1 }] },
      { ...buddy, agent: 'kiro', progress: { done: 9, total: 5 } },
      'buddy',
    ];
    const out = parseViews(JSON.stringify(bad))!;
    expect(out).toHaveLength(3);
    expect(out[0]!.sessions).toEqual([session]);
    expect(out[1]!.sessions[0]).toEqual(session);
    expect(out[2]).not.toHaveProperty('progress');
  });
});
