# Design: Core Pipeline

## Overview

One event travels this path:

```mermaid
sequenceDiagram
  participant A as Agent (Kiro / Claude Code / Codex)
  participant H as agentbuddy-hook
  participant R as Relay (127.0.0.1:port)
  participant F as ~/.agentbuddy
  participant U as Browser UI
  A->>H: raw payload (stdin or last argv)
  H->>H: stamp at, normalize (core), truncate
  H->>R: POST /events + X-AgentBuddy-Token (300 ms timeout)
  H-->>A: exit 0 (always, by 900 ms)
  R->>R: Host / Origin / token / size / validate
  R->>F: append events-YYYY-MM-DD.jsonl
  R->>R: insert into buddy window, refold (core)
  R->>F: read tasks.md (Kiro, guarded path)
  R->>U: SSE "buddies" (full list)
```

All decisions live in `src/core` as pure functions. The hook, relay and UI are thin shells around them: the hook does stdin/argv and one HTTP call, the relay does files, HTTP and a clock tick, and the UI does the DOM.

## Architecture

```
src/core     config  event  text  normalize  history  state  progress
               ▲        ▲      ▲       ▲          ▲       ▲       ▲
src/hook     cli ──────────────────────┘ (normalize, truncate via normalize, config)
src/relay    main → home, store (history, state), server (event), stream, tasks (progress)
src/ui       main → screens/list   (imports core types only)
```

- `src/core` imports nothing outside `src/core` and no Node built-ins, so the UI and the later demo build can bundle it for the browser.
- Only `src/hook` and `src/relay` use `node:fs`, `node:http`, `node:os`, `node:crypto`. Only `src/ui` touches the DOM.

## Components and interfaces

### `src/core/config.ts`
Shared constants, so the hook, relay and tests never disagree.

```ts
export const DEFAULT_PORT = 4343;
export const TEXT_LIMIT = 120;              // code points
export const WINDOW_SIZE = 50;              // events per buddy
export const IDLE_AFTER_MS = 10 * 60_000;
export const OFFLINE_AFTER_MS = 30 * 60_000;
export const HOOK_LIMITS = { stdinWaitMs: 500, postTimeoutMs: 300, hardExitMs: 900, maxStdinBytes: 1_048_576, maxErrorLogBytes: 1_048_576 };
export const RELAY_LIMITS = { maxBodyBytes: 16_384, tickMs: 30_000, heartbeatMs: 25_000, maxTasksFileBytes: 1_048_576, restoreWindowMs: 24 * 3_600_000 };
export const HOME_DIR = '.agentbuddy', TOKEN_FILE = 'token', HOOK_ERROR_LOG = 'hook-errors.log';
export function parsePort(value: string | undefined): number; // /^\d+$/ and 1..65535, else DEFAULT_PORT
```

### `src/core/event.ts` (Req 1)

```ts
export type AgentId = 'kiro' | 'claude' | 'codex';
export type EventKind = 'prompt' | 'task_start' | 'task_done' | 'permission' | 'idle' | 'stop';
export interface TaskInfo { name: string; specPath: string; success?: boolean }
export interface BuddyEvent { v: 1; agent: AgentId; session: string; kind: EventKind; at: string; cwd: string; text?: string; task?: TaskInfo }

export const KIND_ORDER: Readonly<Record<EventKind, number>> =
  { prompt: 0, task_start: 1, permission: 2, task_done: 3, stop: 4, idle: 5 };

export function validateEvent(value: unknown): BuddyEvent | null;
```

`validateEvent` builds a new object from known fields only (Req 1.6) and checks:
- `at` matches `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$` and `Date.parse(at)` is finite. `Date.parse` is pure; it does not read the clock.
- `session`, `cwd` non-empty strings; `text` and `task.name` 1–120 code points; `task.specPath` non-empty; `task.success` boolean if present.
- `task` present for `task_start` / `task_done` (Req 1.5). For other kinds `task` is dropped.

It is wrapped in `try/catch` and returns `null` on any exception (getters on hostile objects, for example).

### `src/core/text.ts` (Req 6, 7.3)

```ts
export function truncate(input: string, limit = TEXT_LIMIT): string;
export function codePointLength(s: string): number;
export const AGENT_NAMES: Readonly<Record<AgentId, string>>; // Kiro, Claude Code, Codex
export function folderName(cwd: string): string;             // last non-empty '/' segment, or cwd
export function displayName(agent: AgentId, cwd: string): string; // "Kiro @ demo"
export function shortId(session: string): string;           // first 8 code points
```

`truncate`: `s.replace(/\s+/gu, ' ').trim()`, split with `Array.from` (code points, so surrogate pairs stay whole), and if longer than `limit` keep `limit - 1` code points plus `…`. It is idempotent: a result of exactly 120 code points is returned unchanged.

### `src/core/normalize.ts` (Req 2–5)

```ts
export function normalize(agent: AgentId, raw: string, at: string): BuddyEvent | null;
export function normalizeKiro(p: Record<string, unknown>, at: string): BuddyEvent | null;
export function normalizeClaude(p: Record<string, unknown>, at: string): BuddyEvent | null;
export function normalizeCodex(p: Record<string, unknown>, at: string): BuddyEvent | null;
export const CODEX_TITLE_PREFIX = 'Generate a concise, single-line task title';
```

`normalize` does: `JSON.parse` in `try/catch` → must be a plain non-array object → per-agent function → `validateEvent` on the result. The whole body is in `try/catch` returning `null`, and the final `validateEvent` guarantees Req 5.3 even if a per-agent function has a bug.

Field reading uses small helpers (`str(p, key)` returns a non-empty string or `undefined`) so no code path assumes a type. Text goes through `truncate`; an empty result means no `text` (Req 5.7).

Per-agent mapping, exactly the events.md table:

| Agent | Condition | Result |
|---|---|---|
| kiro | `hook_event_name` = `UserPromptSubmit` | `prompt`, text ← `prompt` |
| kiro | `PreTaskExec` with `task_name`, `spec_name` | `task_start`, task ← { name, specPath } |
| kiro | `PostTaskExec` with `task_name`, `spec_name` | `task_done`, task ← { name, specPath, success if boolean } |
| kiro | `Stop` | `stop`, no text |
| claude | `UserPromptSubmit` | `prompt`, text ← `prompt` |
| claude | `Notification` + `permission_prompt` | `permission` |
| claude | `Notification` + `idle_prompt` | `idle` |
| claude | `Stop` | `stop`, text ← `last_assistant_message` |
| codex | `type` = `agent-turn-complete`, no title signal | `stop`, session ← `thread-id`, text ← `last-assistant-message` |
| any | everything else | `null` |

Codex title signals (either one drops the event):
1. The last item of `input-messages` is a string whose `trimStart()` starts with `CODEX_TITLE_PREFIX`.
2. `last-assistant-message` trimmed parses as JSON to a non-null, non-array object with an own `title` property.

### `src/core/history.ts` (Req 8)

```ts
export interface Stamped { event: BuddyEvent; seq: number; atMs: number }
export function stamp(event: BuddyEvent, seq: number): Stamped;   // atMs = Date.parse(event.at)
export function compareStamped(a: Stamped, b: Stamped): number;   // atMs, then KIND_ORDER, then seq
export function buddyKey(agent: AgentId, cwd: string): string;    // JSON.stringify([agent, cwd])
export function insertEvent(window: readonly Stamped[], item: Stamped, cap = WINDOW_SIZE): Stamped[];
export function isTaskEvent(item: Stamped): boolean;                               // task_start or task_done
export function laterTask(kept: Stamped | undefined, item: Stamped): Stamped | undefined;
```

`insertEvent` returns a new array: `[...window, item].sort(compareStamped).slice(-cap)`. With 50 items, sorting each time costs nothing measurable, and it keeps the window a pure function of the set of events it has seen. An event older than the 50 kept ones sorts first and is cut off at once, which is the only way an event is left out (Req 8.3).

`laterTask(kept, item)` keeps the latest task event (Req 8.6): it returns `item` if `item` is a task event and `kept` is undefined or `compareStamped(item, kept) > 0`, else `kept`. It is a running maximum under one total order, so the result depends only on the set of task events, not on arrival order (Req 8.7). It never looks at the window, so events leaving the window cannot remove it.

`buddyKey` uses `JSON.stringify` so no `cwd` value can collide with another pair.

### `src/core/state.ts` (Req 7, 9, 10)

```ts
export type CoreState = 'WORKING' | 'WAITING_APPROVAL' | 'TURN_DONE' | 'IDLE';
export type DisplayState = CoreState | 'STALE' | 'OFFLINE';
export type Progress = { done: number; total: number } | null; // null = unknown

export interface BuddyState {
  key: string; agent: AgentId; cwd: string; name: string;
  state: CoreState; statusText?: string;
  lastAt: string; lastAtMs: number; session: string;
  specPath?: string;            // Kiro only, from the latest task event (kept outside the window)
}
export interface BuddyRecord { window: Stamped[]; lastTask?: Stamped; state: BuddyState }
export type BuddyList = ReadonlyMap<string, BuddyRecord>;

export function nextState(prev: CoreState | undefined, kind: EventKind): CoreState;
export function foldBuddy(window: readonly Stamped[], lastTask: Stamped | undefined): BuddyState; // window is non-empty
export function applyEvent(list: BuddyList, event: BuddyEvent, seq: number): { list: BuddyList; key: string };
export function displayState(b: BuddyState, nowMs: number): DisplayState;

export interface BuddyView {
  key: string; agent: AgentId; name: string; cwd: string;
  state: DisplayState; statusText?: string; lastAt: string; session: string; // short id
  progress?: Progress;          // present for Kiro buddies only
}
export function toView(b: BuddyState, progress: Progress, nowMs: number): BuddyView;
export function toViews(list: BuddyList, progress: ReadonlyMap<string, Progress>, nowMs: number): BuddyView[]; // sorted by name, then cwd
```

`nextState(prev, kind)`:

| kind | result |
|---|---|
| `prompt`, `task_start` | `WORKING` |
| `permission` | `WAITING_APPROVAL` |
| `stop` | `TURN_DONE` |
| `idle` | `IDLE` |
| `task_done` | `prev ?? 'WORKING'` (Req 9.5, 9.6) |

This table is the whole state machine. `WAITING_APPROVAL` and `TURN_DONE` each appear in one row only (Req 9.7), and every exit from `WAITING_APPROVAL` that events.md requires is a row that does not return it (Req 9.8).

`foldBuddy` walks the window in order: state via `nextState`, and status text from `text` or `task.name` when present (Req 9.9). `lastAt`, `lastAtMs` and `session` come from the last element. On Kiro buddies, `specPath` is `lastTask.event.task.specPath` (Req 9.10). Because the window is sorted and the fold restarts from its first element, arrival order cannot change the result except through `seq` on exact (`at`, kind) ties (Req 8.5).

`applyEvent(list, event, seq)`: `item = stamp(event, seq)`; `window = insertEvent(old?.window ?? [], item)`; `lastTask = laterTask(old?.lastTask, item)`; `state = foldBuddy(window, lastTask)`. It returns a new map and does not change the old one.

`displayState(b, now)`: `age = max(0, now - lastAtMs)`; `age >= 30 min` → `OFFLINE`; else `age >= 10 min` → `IDLE` for `TURN_DONE`, `STALE` for `WORKING` / `WAITING_APPROVAL`, `IDLE` stays `IDLE`; else `b.state`.

### `src/core/progress.ts` (Req 11, 19.2)

```ts
export function parseProgress(text: string): { done: number; total: number };
export function isAllowedSpecPath(realSpecPath: string, realCwd: string): boolean;
```

`parseProgress` splits on `/\r?\n/` and matches each line against `/^- \[([^\]])\](\*?)/u`:
- `[^\]]` with the `u` flag is exactly one code point that is not `]`, so `- []` and `- [xx]` are not tasks.
- done = the character is `x` or `X`.
- optional (`*` right after `]`): add to `total` only when done. Otherwise add to `total`, and to `done` when done.

Indented lines never match because of `^- `. Since every counted line adds 1 to `total` and at most 1 to `done`, `0 <= done <= total` holds by construction (Req 11.7).

`isAllowedSpecPath` works on strings that the relay has already resolved with `realpath`, using `/` separators (macOS and Linux):
- `realCwd` without a trailing `/` (except `/` itself) gives the prefix `realCwd + '/'`.
- true only if `realSpecPath` starts with that prefix and matches `/\/\.kiro\/specs\/[^/]+\/tasks\.md$/`.

The prefix check with the trailing `/` rejects sibling folders such as `/Users/dev/demo2` for `cwd` `/Users/dev/demo`.

### `src/hook/cli.ts` (Req 12–14)

Timeline (worst case, relay hanging and stdin never closing):

```
0 ms      Node starts
~40 ms    module runs: at = new Date().toISOString(); arm hard-exit timer for (900 - uptime) ms
≤540 ms   stdin wait ends (500 ms cap), stdin destroyed
≤850 ms   POST aborted (300 ms cap)
900 ms    hard-exit timer → process.exit(0)
```

Flow:
1. First statement: `const at = new Date().toISOString()`. Then `setTimeout(() => process.exit(0), Math.max(0, 900 - process.uptime() * 1000))`. This timer stays referenced; it is the guard for Req 13.2. `process.uptime()` makes the 900 ms count from process start, not from module load.
2. `process.on('uncaughtException' | 'unhandledRejection')` → log a fixed code, `process.exit(0)`.
3. Agent from `process.argv[2]`; unknown → log `bad_agent`, exit 0.
4. Input:
   - `codex`: `process.argv.at(-1)` when `argv.length >= 4`, else log `no_payload`. stdin is never touched.
   - `kiro`, `claude`: if `stdin.isTTY`, empty. Otherwise collect chunks until `end` or 500 ms, then `stdin.destroy()`. Over 1 MB → log `too_large`, exit 0.
5. `normalize(agent, raw, at)`; `null` → exit 0 silently (Req 12.6).
6. Token: `readFileSync(~/.agentbuddy/token).trim()`; failure → log `no_token`.
7. POST with `node:http` (lighter to load than `fetch`): host `127.0.0.1`, port `parsePort(process.env.AGENTBUDDY_PORT)`, path `/events`, headers `content-type: application/json`, `content-length`, `x-agentbuddy-token`, `signal: AbortSignal.timeout(300)`. Non-2xx → log `http_<status>`; error → log `post_timeout` or `post_<errno code>`.
8. `process.exit(0)`.

Error log (Req 13.4–13.7): one line `<ISO time> <agent> <code>\n`, appended with `appendFileSync` after `mkdirSync(~/.agentbuddy, { recursive: true, mode: 0o700 })`. Codes come from a fixed list, so payload text, file paths and the token can never reach the log. If the log is already over 1 MB, the line is skipped. The whole logging function is in `try/catch` and ignores every failure. Nothing is ever written to stdout or stderr, because Claude Code and Kiro may add hook stdout to the agent's context.

### `src/relay/home.ts`
- `homePath(...parts)` → `join(os.homedir(), '.agentbuddy', ...parts)`.
- `ensureHome()` → `mkdir` with mode 700.
- `loadOrCreateToken()` → read and trim; if missing or empty, write `randomBytes(32).toString('hex')` with `{ flag: 'wx', mode: 0o600 }`, and on `EEXIST` (another relay won the race) read again.
- `logFileName(d: Date)` → `events-YYYY-MM-DD.jsonl` from local date parts.

### `src/relay/store.ts` (Req 16, 17)

```ts
export interface Store {
  accept(event: BuddyEvent, nowMs: number): string;   // returns buddy key
  restore(nowMs: number): Promise<number>;            // events replayed
  record(key: string): BuddyRecord | undefined;
  setProgress(key: string, p: Progress): boolean;     // true if changed
  views(nowMs: number): BuddyView[];
}
export function createStore(opts: { dir: string }): Store;
```

- Holds `list: BuddyList`, `progress: Map<string, Progress>`, and `seq`, a counter that increases on every accept and replay.
- `accept`: `applyEvent(list, event, ++seq)`, then append `JSON.stringify(event) + '\n'` to `logFileName(new Date(nowMs))`. Appends are chained on one promise so lines keep their order. Each file is opened with `{ flag: 'a', mode: 0o600 }`, and the mode applies when the file is created. A failed append prints `log write failed: <errno code>` to the relay's stderr and changes nothing else (Req 16.5).
- `restore(now)`: read yesterday's then today's file (Req 17.1). For each line: `JSON.parse` in `try`, `validateEvent`, keep if `now - 24h <= atMs`, then `applyEvent` with `++seq`. Missing or unreadable files are skipped.
- `views(now)` → `toViews(list, progress, now)`. A Kiro buddy's progress is `progress.get(key) ?? null`, and it is `null` whenever the buddy has no spec path (Req 19.5).

### `src/relay/tasks.ts` (Req 19)

```ts
export async function readProgress(specPath: string, cwd: string): Promise<Progress>;
```

1. Return `null` unless `specPath` and `cwd` are absolute.
2. `realpath` both. Any error → `null`.
3. `isAllowedSpecPath(realSpec, realCwd)` false → `null`.
4. `stat(realSpec)`: must be a regular file of at most 1 MB.
5. `readFile(realSpec, 'utf8')` → `parseProgress`.

The relay calls it from `main.ts` after `accept` when the agent is `kiro`, the kind is `task_start`, `task_done` or `stop`, and the folded buddy has a `specPath`. Each buddy has a request counter, and a result is applied only if no newer read for that buddy has started, so a slow old read cannot overwrite a newer one.

### `src/relay/server.ts` (Req 15, 16, 18.5)

```ts
export function createRelayServer(deps: {
  port: number; token: string; uiDir: string;
  onEvent(event: BuddyEvent): void; onStream(res: ServerResponse): void;
}): http.Server;
```

Checks, in this order:

| Step | Condition | Reply |
|---|---|---|
| 1 | `Host` not `127.0.0.1:<port>` or `localhost:<port>` | 403 |
| 2 | `POST /events` with any `Origin` header | 403 |
| 3 | token header missing, or `timingSafeEqual` fails (lengths compared first) | 401 |
| 4 | `content-length` > 16 KB, or streamed body passes 16 KB | 413, socket closed |
| 5 | body not JSON, or `validateEvent` → `null` | 400 |
| 6 | accepted: `onEvent(event)` | 204 |

The token check runs before the body is read, so unauthenticated requests never get their body parsed.

Other routes:
- `GET /stream` → `onStream(res)`.
- `GET /` and `GET /<file>` → static files from `uiDir` (`dist/ui`). The path is decoded, must not contain `\0`, and must resolve inside `uiDir`. Content types: `.html`, `.js`, `.css`, `.svg`, `.json`. Headers: `Content-Security-Policy: default-src 'self'`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`.
- Anything else → 404. A known path with the wrong method → 405.
- No CORS headers on any reply (Req 15.8).

### `src/relay/stream.ts` (Req 18)

```ts
export interface Stream { add(res: ServerResponse, list: BuddyView[]): void; broadcast(list: BuddyView[]): void; close(): void }
export function createStream(heartbeatMs: number): Stream;
```

- Headers `Content-Type: text/event-stream`, `Cache-Control: no-store`, `Connection: keep-alive`.
- Message: `event: buddies\ndata: <JSON BuddyView[]>\n\n`. A full list is sent each time. With a handful of buddies, this is simpler than sending diffs and no client can drift out of sync.
- One interval writes `: ping\n\n` to all clients every 25 s. Clients are removed on `close`.

### `src/relay/main.ts`

1. `port = parsePort(process.env.AGENTBUDDY_PORT)`; `ensureHome()`; `token = loadOrCreateToken()`.
2. `store = createStore(...)`; `await store.restore(Date.now())`; then `readProgress` for every Kiro buddy with a spec path (Req 17.4).
3. Wire `onEvent`: `store.accept` → maybe `readProgress` → `broadcastIfChanged()`.
4. `broadcastIfChanged()`: compute `store.views(Date.now())`, compare its JSON with the last sent JSON, and broadcast only if different.
5. `setInterval(broadcastIfChanged, 30_000)` drives the time-based states (Req 10.7).
6. `server.listen(port, '127.0.0.1')`. On `EADDRINUSE`, print `port <port> is in use (set AGENTBUDDY_PORT)` and exit 1. On success print `AgentBuddy relay: http://127.0.0.1:<port>/`.
7. `SIGINT` / `SIGTERM`: close the stream and server, then exit.

### `src/ui` (Req 20)

- `index.html` (project root, for Vite): a heading, `<p id="notice" hidden>relay disconnected</p>`, and an empty `<table id="buddies">` with header cells `Buddy`, `State`, `Status`, `Progress`, `Last event`, `Session`, `Folder`.
- `src/ui/main.ts`: `new EventSource('/stream')`. On `buddies`, parse, check `Array.isArray`, render, and hide the notice. `onerror` shows the notice. `EventSource` retries by itself (Req 20.6). Only relay mode exists in this spec. Demo mode comes with the demo spec.
- `src/ui/screens/list.ts`: `renderList(tbody, views)` clears the body and builds rows with `createElement` and `textContent` only (Req 20.5).
  - State cell: `?` for `STALE`, else the state name.
  - Progress cell: Kiro shows `task n/m` or `progress unknown`; Codex shows `Codex reports finished turns only`; Claude Code is empty.
  - Last event: `new Date(lastAt).toLocaleTimeString('en-GB')`.
- No CSS file in this spec (Req 20.7).

## Data models

- **BuddyEvent**: as in events.md, and the same shape on the wire and in each log line.
- **Daily log**: `~/.agentbuddy/events-YYYY-MM-DD.jsonl`, one `BuddyEvent` JSON per line, mode 600, local date when the event was accepted.
- **Token**: `~/.agentbuddy/token`, 64 hex characters, mode 600.
- **Hook error log**: `~/.agentbuddy/hook-errors.log`, lines `<ISO> <agent> <code>`, at most about 1 MB.
- **BuddyView** (SSE payload): see `state.ts`. It carries only truncated text and paths the agent already reported.

## Correctness properties

Each property is a fast-check test in `tests/property/`.

| # | Property | Requirements |
|---|---|---|
| P1 | For any string, and for any JSON value serialized to a string, `normalize` does not throw and returns either `null` or an event `e` with `validateEvent(e)` deep-equal to `e`. Any `text` / `task.name` is at most 120 code points. | 5.1–5.3, 6.1 |
| P2 | For Codex payloads built from the observed example with the title signal in `input-messages`, in `last-assistant-message`, or both, `normalize` returns `null`. | 4.2–4.4 |
| P3 | `truncate(s)` is at most 120 code points, contains no whitespace runs or edge whitespace, keeps every surrogate pair whole, and `truncate(truncate(s)) === truncate(s)`. | 6.1–6.4 |
| P4 | For any list of events with unique (`at`, kind) per buddy, applying them in any permutation gives the same `BuddyState` for every buddy as applying them in event order. | 8.5 |
| P5 | Folding any window, each step that produces `WAITING_APPROVAL` from a different state has kind `permission`, and each step that produces `TURN_DONE` from a different state has kind `stop`. | 9.7 |
| P6 | From `WAITING_APPROVAL`, the next `idle`, `prompt` or `stop` gives a state other than `WAITING_APPROVAL`. | 9.8 |
| P7 | After any sequence of `insertEvent` calls, the window has at most 50 items and equals the last 50 of all inserted items sorted by `compareStamped`. | 8.1–8.2 |
| P8 | For any text, `parseProgress` gives integers with `0 <= done <= total`. | 11.7 |
| P9 | For any Codex event list and any `now`, `displayState` is in {`TURN_DONE`, `IDLE`, `OFFLINE`}. | 10.8 |
| P10 | For any event list with unique (`at`, kind) per buddy, every permutation gives the same `lastTask` per buddy, equal to the maximum task event under `compareStamped`. After that list is followed by 0–200 non-task events with later `at`, `lastTask` and the Kiro `specPath` are unchanged. | 8.6, 8.7, 9.10 |

## Error handling

| Where | Failure | Behavior |
|---|---|---|
| hook | unknown agent, no payload, too large | log code, exit 0 |
| hook | normalize → `null` | exit 0, no log |
| hook | no token, refused, timeout, non-2xx | log code, exit 0 |
| hook | anything else, or still running at 900 ms | exit 0 |
| relay | bad Host / Origin / token / size / body | 403 / 403 / 401 / 413 / 400, nothing stored |
| relay | log append fails | event still applied; errno printed to relay stderr |
| relay | log file missing or bad line on restore | skipped |
| relay | `tasks.md` missing, unreadable, outside `cwd`, too big | progress unknown |
| relay | port in use | message and exit 1 |
| UI | stream drops | `relay disconnected`, automatic retry |

## Testing strategy

- **Fixtures** (`tests/fixtures/payloads.ts`): each fixture is `{ label: 'observed' | 'derived', agent, raw, expected }`. Observed fixtures are the events.md JSON lines copied character for character, including the `…` in shortened IDs. Claude `idle_prompt` is the Claude `Notification` example with the observed `message` and `notification_type`, labeled observed. Derived fixtures: Claude `Notification` with `notification_type: "auth_success"`, and "anything else" (`not json`, `[]`, `null`, Kiro `PreToolUse`, Codex `type: "other"`).
- **Unit tests** (`tests/unit/`):
  - `mapping.test.ts`: one test per events.md mapping row (12).
  - `progress.test.ts`: marker cases (`[ ]`, `[x]`, `[X]`, `[-]`, `[~]`, `[ ]*`, `[x]*`, indented, CRLF) and `isAllowedSpecPath` cases (inside, sibling prefix, outside, wrong tail, nested `specs/a/b`).
  - `state.test.ts`: Kiro `prompt` → `stop` keeps the prompt text; a late `prompt` lands in its place; Claude `permission` then `idle` (trap 3); thresholds at exactly 10 and 30 minutes.
  - `hook.test.ts`: spawns the built `dist/hook.js` with `HOME` set to a temp folder. Cases: exits 0 with empty stdout and stderr when the relay is down, when a fake relay never answers, and when stdin is left open, each within 1000 ms wall time; Codex with stdin left open exits without waiting.
  - `relay.test.ts`: starts the server on a free port with a temp `HOME`. Covers the status codes in the server table, token and log file modes 600, restore from yesterday's and today's files with the 24-hour cut, and a `tasks.md` symlink pointing outside `cwd` → progress unknown.
- **Property tests** (`tests/property/`): P1–P10. Generators build events with `/Users/dev/...` paths and short fake IDs only.
- `os.homedir()` follows `HOME` on macOS and Linux, so tests never touch the real `~/.agentbuddy`.

## Build and project setup

- `package.json`: `"type": "module"`, `"engines": { "node": ">=20" }`, `"bin": { "agentbuddy": "dist/relay.js", "agentbuddy-hook": "dist/hook.js" }`.
- Dev dependencies only: `typescript`, `vite`, `vitest`, `fast-check`, `esbuild`, `@types/node`. They are listed in README. No runtime dependencies.
- `build:node`: esbuild bundles `src/hook/cli.ts` → `dist/hook.js` and `src/relay/main.ts` → `dist/relay.js` (`--platform=node --format=esm --target=node20`, shebang banner). One bundled file keeps hook start-up time low.
- `build:ui`: `vite build` → `dist/ui`.
- Scripts: `build` (both), `relay` (`npm run build && node dist/relay.js`), `dev` (`vite`, proxying `/stream` to `127.0.0.1:<port>` with `changeOrigin: true` so the relay's `Host` check passes), `test` (`vitest run`). `npm run demo` arrives with the demo spec.
- `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
- For local use before the setup spec, `npm link` puts both commands on `PATH`.

## Known limits

- Two windows of the same agent in the same folder merge into one buddy (Req 7.5).
- `cwd` is compared as an exact string. Starting an agent in a subfolder makes a separate buddy.
- Two projects with the same folder name share a display name. The UI also shows the full `cwd`.
- After a relay restart, the latest task event is rebuilt from the last 24 hours of logs only. If the last task run is older than that, progress is unknown until the next task run.
- Kiro never shows `WAITING_APPROVAL`. Codex shows only `TURN_DONE`, `IDLE` and `OFFLINE`.
- Old daily logs are never deleted in this spec.
- Paths are handled with `/` separators. macOS and Linux only.
