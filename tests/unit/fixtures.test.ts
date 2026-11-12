// Fixtures labeled verbatim must match an events.md example character for character (Requirement 21.1, 21.2).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ANYTHING_ELSE, FIXTURES } from '../fixtures/payloads';

const eventsMd = readFileSync(new URL('../../.kiro/steering/events.md', import.meta.url), 'utf8');
const examples = [...eventsMd.matchAll(/^```json\n(.*)\n```$/gm)].map((m) => m[1]);

describe('fixtures', () => {
  it('found the raw payload examples in events.md', () => {
    expect(examples.length).toBe(9);
  });

  it.each(FIXTURES.filter((f) => f.verbatim).map((f) => [f.id, f.raw] as const))('%s is verbatim', (_id, raw) => {
    expect(examples).toContain(raw);
  });

  it('uses every events.md example', () => {
    const verbatim = new Set(FIXTURES.filter((f) => f.verbatim).map((f) => f.raw));
    for (const example of examples) expect(verbatim.has(example!)).toBe(true);
  });

  it('labels every fixture and explains non-verbatim ones', () => {
    for (const f of [...FIXTURES, ...ANYTHING_ELSE]) {
      expect(['observed', 'derived']).toContain(f.label);
      if (!f.verbatim) expect(f.note).toBeTruthy();
      if (f.label === 'derived') expect(f.verbatim).toBe(false);
    }
  });

  it('builds the observed idle_prompt fixture from the events.md values', () => {
    const idle = FIXTURES.find((f) => f.id === 'claude-notification-idle');
    expect(eventsMd).toContain('"message":"Claude is waiting for your input","notification_type":"idle_prompt"');
    expect(idle?.raw).toContain('"message":"Claude is waiting for your input","notification_type":"idle_prompt"');
  });
});
