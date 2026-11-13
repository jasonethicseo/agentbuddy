---
inclusion: always
---

# Tech

## Stack
- **Language**: TypeScript everywhere. Node 20+ for the hook command and the relay. No runtime dependencies for the hook command.
- **UI**: Vite + vanilla DOM (no UI framework). The relay serves the built UI.
- **Desktop app**: Electron (development dependency, run from source with `npm run app`), `contextIsolation` on, `nodeIntegration` off and `sandbox` on in every window.
- **Live updates**: Server-Sent Events from relay to UI.
- **Tests**: Vitest for unit tests, fast-check for property-based tests.
- **Demo**: a static build of the UI that replays a recorded, sanitized event file. Hosted on GitHub Pages.

## Pieces
1. **Hook command** `agentbuddy-hook <agent>`: reads the raw payload (stdin for Kiro and Claude, last argv for Codex), normalizes it with the pure core, and POSTs it to the relay.
2. **Relay** `agentbuddy`: an HTTP server on `127.0.0.1:4343` (port overridable with `AGENTBUDDY_PORT`) that keeps buddy state in memory, appends every accepted event to a daily log `~/.agentbuddy/events-YYYY-MM-DD.jsonl`, rebuilds state from the last 24 hours of logs on start, streams updates to the UI, and reads Kiro `tasks.md` files to compute progress. `startRelay()` (`src/relay/start.ts`) is the relay as a function, used by the `agentbuddy` command and by the app.
3. **UI**: the buddy list (with the "me" row), inbox and settings in the app's main window, and the ping pop-up in its own small window. The relay also serves the buddy list to a browser at `http://127.0.0.1:<port>/`, without the app-only parts (pings, pop-ups, jump, ×, inbox, settings, title bar buttons, toolbar, TIP banner).
5. **Desktop app** `npm run app`: the Electron main process starts its own relay with `startRelay()`, or attaches to a relay already on the port, and reads its `/stream` (no token). It finds pings, plays the ding, shows pop-ups that never take focus, keeps the inbox in `~/.agentbuddy/inbox-YYYY-MM-DD.jsonl` and the settings in `~/.agentbuddy/app-settings.json`, shows a menu bar icon with a count, and brings an agent's app forward with `/usr/bin/lsappinfo` and `/usr/bin/open -b` through `execFile`. macOS only.
4. **Demo build**: the same UI fed by a replay of `demo/events.json` instead of the relay.

## Hard constraints
- **Never block an agent.** The hook command must finish within 1 second and always exit 0. Codex input is read from argv only, never stdin. Kiro and Claude stdin is awaited for at most 500 ms. The POST times out after 300 ms. At 900 ms after process start the command exits 0 no matter what. Errors are swallowed and appended to `~/.agentbuddy/hook-errors.log`. Agent hook configs call it as `agentbuddy-hook <agent> || true` (Kiro hook commands run through a shell), so even a missing or dangling command exits 0.
- **Port.** Default `4343`. Both the hook command and the relay read `AGENTBUDDY_PORT`; an invalid value falls back to `4343`.
- **Local only.** The relay binds to `127.0.0.1`, never `0.0.0.0`. No outbound network calls anywhere at runtime. The app's only connection is to `127.0.0.1:<port>/stream`; its windows load only `app://ui/…` and every other request from them is cancelled. No auto-update, crash report upload or spell-check dictionary download.
- **Block drive-by requests.** Any web page can send requests to localhost. The relay therefore requires a random token in an `X-AgentBuddy-Token` header on `POST /events`. The token is created on first run in `~/.agentbuddy/token` (file mode 600) and read by the hook command. Requests with a browser `Origin` header on `POST /events` are rejected.
- **Pure core.** Normalization, state transitions, progress parsing and text truncation live in `src/core` as pure functions. They never touch the file system, network, timers or `Date.now()`; time is passed in.
- **Normalization never throws.** Any input, including malformed JSON, returns either a valid `BuddyEvent` or `null`.
- **Text is truncated** to 120 code points in the hook command before it leaves the process, and rendered as plain text in the UI (never as HTML).
- **Progress from `tasks.md`**: every top-level line of the form `- [?]` (one character between the brackets, at column 0) is a task; it is done only when that character is `x` or `X`. An optional task (`*` right after `]`, e.g. `- [ ]* 3. …`) counts toward the total only when done. Indented sub-task lines are ignored. Read the file on Kiro `task_start`, `task_done`, and `stop` when a spec path is known for that buddy. Read it only if its real path (symlinks resolved) is inside the buddy's real `cwd` and ends with `/.kiro/specs/<name>/tasks.md`. A missing, unreadable or rejected file leaves progress unknown. Observed in three sample specs (2026-11-12): only `- [ ]` and `- [x]` at the top level and indented `- [x]` sub-tasks; `- [-]`, `- [~]`, `X` and `*` were not observed. Observed in this repo's core-pipeline spec during a task run (2026-11-12, Kiro IDE 1.4.121): the running task was `- [-]`, finished tasks `- [x]`, not-started tasks `- [ ]`. How a task is marked after it finishes: `- [x]` (task 11, written by Kiro when the run ended, 2026-11-12). Running a sub-task with its run button marks only that sub-task line `[-]`; the top-level line keeps its marker. When the last open sub-task (16.5) finished, both it and its top-level task were `[x]` by the end of the run (whether Kiro or the agent running the task wrote the parent is not distinguishable). Progress moved from `task 14/19` to `task 15/19` on that run's `task_done`. `- [~]`, `X` and `*` are still unverified.
- **Sound**: synthesize the "ding" with the Web Audio API. Do not ship recorded sound files. In the app, the ding plays without a user gesture, also while the main window is hidden (Chromium switch `autoplay-policy=no-user-gesture-required`). The relay's browser page plays no ding.
- **Fixtures**: unit tests use the sanitized raw payloads from events.md. Never commit real paths, user names or session IDs.
- **Never change what the user sees without warning.** Any check that focuses, opens or launches windows or apps must be announced first with what will happen and for how long, run once (no loops or repeats left running after the tool call), and stop before the tool call returns. Background processes started for a check must be stopped and confirmed stopped before reporting.

## Testing expectations
- **Property tests**
  - normalize: never throws on arbitrary JSON or strings; output is `null` or a valid `BuddyEvent`; text is at most 120 code points.
  - Codex title turns are always dropped, whichever of the two signals is present.
  - state: applying a set of events in any arrival order gives the same final state as applying them sorted by event order (`at`, kind, `session`). Sets where two events of one session share both `at` and kind are excluded, because arrival order decides those ties.
  - state: each buddy's kept latest task event (and so its spec path) is the same in any arrival order, and stays after any number of later events push the task event out of the 50-event list.
  - state: a buddy's state is one of its sessions' displayed states, and no session of that buddy is more urgent (`OFFLINE` and `ENDED` share the lowest rank).
  - state: removing sessions older than 24 hours leaves every remaining session's state and every remaining buddy's state unchanged.
  - state: a session's name is the same in any arrival order.
  - state: a session whose `cwd` changes mid-session stays in exactly one buddy (agent + its fixed folder), in any arrival order.
  - state: after a session's `end`, its earlier or same-time events arriving late keep it `ENDED`; a later event of the same session brings it back.
  - state: `WAITING_APPROVAL` is only entered by `permission`; `TURN_DONE` only by `stop`.
  - state: a buddy stuck in `WAITING_APPROVAL` leaves it on the next `idle`, `prompt` or `stop`.
  - progress: `0 <= done <= total` for any `tasks.md` text.
  - normalize: `bundleId` and `termProgram` are present exactly when their environment values are well-formed.
  - state: a session's launcher is the same in any arrival order.
  - pings: no previous list gives none; the same list twice gives none; a session's ping count equals the times it enters `WAITING_APPROVAL` or `TURN_DONE` after the baseline list.
  - menu bar count: for any lists, pings, acknowledgements and hides, it equals the `WAITING_APPROVAL` sessions plus the unacknowledged finished turns.
  - inbox: an entry is acknowledged exactly when a later `ack` record of its session exists; hidden sessions come back on a later event, and marks older than 24 hours go.
  - status lines: with hide-text on there is no excerpt; otherwise the excerpt is at most 40 code points.
  - pop-ups: placed inside the visible area, never overlapping, each newer one above the older ones.
  - jump: never runs a bundle ID that fails the events.md form; a folder only for Kiro sessions under the messenger-app rule; `-b` is the only argument starting with `-`.
  - app files: settings and inbox records parse without throwing and keep only known keys of the right type.
  - buddy list model: every buddy is in exactly one group; the offline group holds exactly the buddies whose sessions are all `OFFLINE` or `ENDED`.
  - themes: reading a theme gives one of the two themes for any JSON value or string; saving and reading the settings back gives the same theme; every token name of one theme is defined by the other.
  - tips: for any day number and conditions, the starting tip applies and is the same for the same inputs; pressing next as many times as there are applicable tips visits each once and returns; on a day the skin changed, no start, next or kept tip is a skin tip.
  - settings: `hideBanner` reads as a boolean for any JSON value, `true` only for `true`; it survives saving and reading back.
- **Unit tests**: one test per row of the mapping table in events.md, using the sanitized payloads.

## Commands
- `npm run dev` — UI dev server against a running relay
- `npm run relay` — start the relay
- `npm run app` — build, then start the desktop app from source
- `npm run demo` — UI in replay mode (later spec; not built yet)
- `npm run build` — build hook command, relay and UI
- `npm test` — run all tests once (never starts Electron, opens a window, or runs `open` or `lsappinfo`)
- `npm run typecheck` — type check without emitting
