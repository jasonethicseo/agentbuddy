---
inclusion: always
---

# Tech

## Stack
- **Language**: TypeScript everywhere. Node 20+ for the hook command and the relay. No runtime dependencies for the hook command.
- **UI**: Vite + vanilla DOM (no UI framework). The relay serves the built UI.
- **Live updates**: Server-Sent Events from relay to UI.
- **Tests**: Vitest for unit tests, fast-check for property-based tests.
- **Demo**: a static build of the UI that replays a recorded, sanitized event file. Hosted on GitHub Pages.

## Pieces
1. **Hook command** `agentbuddy-hook <agent>`: reads the raw payload (stdin for Kiro and Claude, last argv for Codex), normalizes it with the pure core, and POSTs it to the relay.
2. **Relay** `agentbuddy`: an HTTP server on `127.0.0.1:4343` (port overridable with `AGENTBUDDY_PORT`) that keeps buddy state in memory, appends every accepted event to a daily log `~/.agentbuddy/events-YYYY-MM-DD.jsonl`, rebuilds state from the last 24 hours of logs on start, streams updates to the UI, and reads Kiro `tasks.md` files to compute progress.
3. **UI**: the buddy list, message pop-ups, inbox and settings, in the browser.
4. **Demo build**: the same UI fed by a replay of `demo/events.json` instead of the relay.

## Hard constraints
- **Never block an agent.** The hook command must finish within 1 second and always exit 0. Codex input is read from argv only, never stdin. Kiro and Claude stdin is awaited for at most 500 ms. The POST times out after 300 ms. At 900 ms after process start the command exits 0 no matter what. Errors are swallowed and appended to `~/.agentbuddy/hook-errors.log`. Agent hook configs call it as `agentbuddy-hook <agent> || true` (Kiro hook commands run through a shell), so even a missing or dangling command exits 0.
- **Port.** Default `4343`. Both the hook command and the relay read `AGENTBUDDY_PORT`; an invalid value falls back to `4343`.
- **Local only.** The relay binds to `127.0.0.1`, never `0.0.0.0`. No outbound network calls anywhere at runtime.
- **Block drive-by requests.** Any web page can send requests to localhost. The relay therefore requires a random token in an `X-AgentBuddy-Token` header on `POST /events`. The token is created on first run in `~/.agentbuddy/token` (file mode 600) and read by the hook command. Requests with a browser `Origin` header on `POST /events` are rejected.
- **Pure core.** Normalization, state transitions, progress parsing and text truncation live in `src/core` as pure functions. They never touch the file system, network, timers or `Date.now()`; time is passed in.
- **Normalization never throws.** Any input, including malformed JSON, returns either a valid `BuddyEvent` or `null`.
- **Text is truncated** to 120 code points in the hook command before it leaves the process, and rendered as plain text in the UI (never as HTML).
- **Progress from `tasks.md`**: every top-level line of the form `- [?]` (one character between the brackets, at column 0) is a task; it is done only when that character is `x` or `X`. An optional task (`*` right after `]`, e.g. `- [ ]* 3. …`) counts toward the total only when done. Indented sub-task lines are ignored. Read the file on Kiro `task_start`, `task_done`, and `stop` when a spec path is known for that buddy. Read it only if its real path (symlinks resolved) is inside the buddy's real `cwd` and ends with `/.kiro/specs/<name>/tasks.md`. A missing, unreadable or rejected file leaves progress unknown. Observed in three sample specs (2026-11-12): only `- [ ]` and `- [x]` at the top level and indented `- [x]` sub-tasks; `- [-]`, `- [~]`, `X` and `*` were not observed. Observed in this repo's core-pipeline spec during a task run (2026-11-12, Kiro IDE 1.4.121): the running task was `- [-]`, finished tasks `- [x]`, not-started tasks `- [ ]`. How a task is marked after it finishes: `- [x]` (task 11, written by Kiro when the run ended, 2026-11-12). Running a sub-task with its run button marks only that sub-task line `[-]`; the top-level line keeps its marker. When the last open sub-task (16.5) finished, both it and its top-level task were `[x]` by the end of the run (whether Kiro or the agent running the task wrote the parent is not distinguishable). Progress moved from `task 14/19` to `task 15/19` on that run's `task_done`. `- [~]`, `X` and `*` are still unverified.
- **Sound**: synthesize the "ding" with the Web Audio API. Do not ship recorded sound files. Start audio only after a user gesture.
- **Fixtures**: unit tests use the sanitized raw payloads from events.md. Never commit real paths, user names or session IDs.
- **Never change what the user sees without warning.** Any check that focuses, opens or launches windows or apps must be announced first with what will happen and for how long, run once (no loops or repeats left running after the tool call), and stop before the tool call returns. Background processes started for a check must be stopped and confirmed stopped before reporting.

## Testing expectations
- **Property tests**
  - normalize: never throws on arbitrary JSON or strings; output is `null` or a valid `BuddyEvent`; text is at most 120 code points.
  - Codex title turns are always dropped, whichever of the two signals is present.
  - state: applying a set of events in any arrival order gives the same final state as applying them sorted by event order (`at`, kind, `session`). Sets where two events of one session share both `at` and kind are excluded, because arrival order decides those ties.
  - state: each buddy's kept latest task event (and so its spec path) is the same in any arrival order, and stays after any number of later events push the task event out of the 50-event list.
  - state: a buddy's state is one of its sessions' displayed states, and no session of that buddy is more urgent.
  - state: removing sessions older than 24 hours leaves every remaining session's state and every remaining buddy's state unchanged.
  - state: a session's name is the same in any arrival order.
  - state: a session whose `cwd` changes mid-session stays in exactly one buddy (agent + its fixed folder), in any arrival order.
  - state: after a session's `end`, its earlier or same-time events arriving late keep it `OFFLINE`; a later event of the same session brings it back.
  - state: `WAITING_APPROVAL` is only entered by `permission`; `TURN_DONE` only by `stop`.
  - state: a buddy stuck in `WAITING_APPROVAL` leaves it on the next `idle`, `prompt` or `stop`.
  - progress: `0 <= done <= total` for any `tasks.md` text.
- **Unit tests**: one test per row of the mapping table in events.md, using the sanitized payloads.

## Commands
- `npm run dev` — UI dev server against a running relay
- `npm run relay` — start the relay
- `npm run demo` — UI in replay mode
- `npm run build` — build hook command, relay and UI
- `npm test` — run all tests once
