// Kiro spec progress from tasks.md text, and the spec path check (tech.md "Progress from tasks.md").
// Pure: no file system, network, timers or clock. The relay reads files and resolves real paths.

/**
 * A top-level task line: column 0, `- [`, exactly one code point that is not `]`, then `]`.
 * A `*` right after `]` marks an optional task. Observed markers: `[ ]`, `[-]` (running), `[x]`.
 */
const TASK_LINE = /^- \[([^\]])\](\*?)/u;

/**
 * `{ done, total }` over top-level task lines. A task is done only when its marker is
 * `x` or `X`. Optional tasks count toward `total` only when done. Indented sub-task
 * lines never match. `\n` and `\r\n` are treated the same.
 */
export function parseProgress(text: string): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const line of text.split(/\r?\n/)) {
    const m = TASK_LINE.exec(line);
    if (!m) continue;
    const isDone = m[1] === 'x' || m[1] === 'X';
    const optional = m[2] === '*';
    if (optional && !isDone) continue;
    total++;
    if (isDone) done++;
  }
  return { done, total };
}

const SPEC_TAIL = /\/\.kiro\/specs\/[^/]+\/tasks\.md$/;

/**
 * True only if `realSpecPath` is inside `realCwd` and ends with
 * `/.kiro/specs/<name>/tasks.md`. Both must already be real paths (symlinks
 * resolved) with `/` separators. The trailing `/` on the prefix rejects
 * sibling folders such as `/Users/dev/demo2` for `/Users/dev/demo`.
 */
export function isAllowedSpecPath(realSpecPath: string, realCwd: string): boolean {
  if (!realSpecPath.startsWith('/') || !realCwd.startsWith('/')) return false;
  const prefix = realCwd === '/' ? '/' : `${realCwd.replace(/\/+$/, '')}/`;
  return realSpecPath.startsWith(prefix) && SPEC_TAIL.test(realSpecPath);
}
