// tasks.md markers and the spec path check (Requirements 11, 19.2).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isAllowedSpecPath, parseProgress } from '../../src/core/progress';
import { createProgressReader } from '../../src/relay/tasks';
import type { Progress } from '../../src/core/buddies';

describe('parseProgress', () => {
  it.each([
    ['- [ ] 1. A', { done: 0, total: 1 }],
    ['- [x] 1. A', { done: 1, total: 1 }],
    ['- [X] 1. A', { done: 1, total: 1 }],
    ['- [-] 1. A (running, observed)', { done: 0, total: 1 }],
    ['- [~] 1. A', { done: 0, total: 1 }],
    ['- [ ]* 1. optional, not done', { done: 0, total: 0 }],
    ['- [x]* 1. optional, done', { done: 1, total: 1 }],
    ['  - [x] 1.1 sub-task', { done: 0, total: 0 }],
    ['\t- [x] 1.1 sub-task', { done: 0, total: 0 }],
    ['- [] 1. no marker', { done: 0, total: 0 }],
    ['- [xx] 1. two characters', { done: 0, total: 0 }],
    ['* [x] 1. other bullet', { done: 0, total: 0 }],
    ['1. [x] numbered', { done: 0, total: 0 }],
    ['- [😀] 1. one code point', { done: 0, total: 1 }],
  ])('%s', (line, expected) => {
    expect(parseProgress(line)).toEqual(expected);
  });

  it('treats CRLF like LF and ignores sub-tasks', () => {
    const lf = '# Tasks\n\n- [x] 1. A\n  - [x] 1.1 a\n- [-] 2. B\n  - [ ] 2.1 b\n- [ ] 3. C\n';
    expect(parseProgress(lf)).toEqual({ done: 1, total: 3 });
    expect(parseProgress(lf.replaceAll('\n', '\r\n'))).toEqual({ done: 1, total: 3 });
  });

  it("counts this repository's own spec like a line count would", () => {
    const text = readFileSync(new URL('../../.kiro/specs/core-pipeline/tasks.md', import.meta.url), 'utf8');
    const top = text.split('\n').filter((l) => /^- \[.\]/u.test(l));
    expect(parseProgress(text)).toEqual({ done: top.filter((l) => l.startsWith('- [x]')).length, total: top.length });
    expect(top.length).toBeGreaterThan(15);
  });
});

describe('isAllowedSpecPath', () => {
  const cwd = '/Users/dev/demo';
  it.each([
    ['/Users/dev/demo/.kiro/specs/hello-file/tasks.md', cwd, true],
    ['/Users/dev/demo/pkg/.kiro/specs/a/tasks.md', cwd, true],
    ['/Users/dev/demo/.kiro/specs/hello-file/tasks.md', '/Users/dev/demo/', true],
    ['/Users/dev/demo2/.kiro/specs/a/tasks.md', cwd, false],
    ['/Users/dev/other/.kiro/specs/a/tasks.md', cwd, false],
    ['/Users/dev/demo/.kiro/specs/a/requirements.md', cwd, false],
    ['/Users/dev/demo/tasks.md', cwd, false],
    ['/Users/dev/demo/.kiro/specs/a/b/tasks.md', cwd, false],
    ['/Users/dev/demo/.kiro/specs/tasks.md', cwd, false],
    ['/Users/dev/demo/.kiro/specs/a/tasks.md.bak', cwd, false],
    ['.kiro/specs/a/tasks.md', '.', false],
    ['/.kiro/specs/a/tasks.md', '/', true],
  ])('%s in %s → %s', (spec, dir, expected) => {
    expect(isAllowedSpecPath(spec, dir)).toBe(expected);
  });
});

describe('createProgressReader', () => {
  it('applies only the newest read for a buddy, even when an older one finishes last', async () => {
    const pending: Array<(p: Progress) => void> = [];
    const applied: Array<[string, Progress]> = [];
    const refresh = createProgressReader(
      (key, p) => applied.push([key, p]),
      () => new Promise<Progress>((resolve) => pending.push(resolve)),
    );
    const first = refresh('kiro-demo', '/x/.kiro/specs/a/tasks.md', '/x');
    const second = refresh('kiro-demo', '/x/.kiro/specs/a/tasks.md', '/x');
    const other = refresh('kiro-app', '/y/.kiro/specs/b/tasks.md', '/y');
    pending[1]!({ done: 2, total: 5 }); // newer read finishes first
    pending[0]!({ done: 1, total: 5 }); // older read finishes last and must be ignored
    pending[2]!(null);
    await Promise.all([first, second, other]);
    expect(applied).toEqual([
      ['kiro-demo', { done: 2, total: 5 }],
      ['kiro-app', null],
    ]);
  });
});
