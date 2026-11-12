# Requirements: Core Pipeline

## Introduction

This spec builds the AgentBuddy pipeline end to end, with no styling: an agent hook fires, `agentbuddy-hook` normalizes the raw payload and POSTs it to the local relay, the relay updates buddy state, and a plain-text buddy list in the browser updates live.

The contract is `.kiro/steering/events.md`. Every mapping here comes from that file. Behavior that events.md does not record is marked **UNVERIFIED** and is never guessed: unverified input is dropped or left unknown.

### In scope
- `src/core`: the `BuddyEvent` type and validation, per-agent normalization (Kiro, Claude Code, Codex), buddy state rules, `tasks.md` progress parsing, text truncation.
- `src/hook/cli.ts`: the `agentbuddy-hook <agent>` command.
- `src/relay`: HTTP server on `127.0.0.1`, token check, daily event logs, restore on start, live stream, Kiro progress reading.
- `src/ui`: a minimal, unstyled, text-only buddy list.

### Out of scope (later specs)
- Messenger look and feel, icons, status message flavor text (`♪`, `~`, `T_T`).
- "Ding" sound and message pop-up window.
- Inbox (message box).
- Settings screen, including the "hide message text" setting.
- Demo build, `demo/events.json` and `npm run demo`.
- Setup command that prints hook snippets, and opening the browser automatically.
- Deleting old daily logs.

## Glossary
- **Raw payload**: the JSON an agent hands to the hook command (stdin for Kiro and Claude Code, last argv for Codex).
- **BuddyEvent**: the normalized event defined in events.md ("Normalized event").
- **Buddy**: one **agent + `cwd`** pair (events.md "Buddies"). All sessions of that agent in that exact `cwd` string feed one buddy.
- **Display name**: `<Agent> @ <folder name>`, with agent names `Kiro`, `Claude Code`, `Codex` and the folder name being the last segment of `cwd`.
- **Session**: the `session` field of an event (Kiro/Claude `session_id`, Codex `thread-id`). Kept and logged, never used to split buddies.
- **Event window**: the latest 50 events of one buddy, sorted by event order.
- **Latest task event**: per buddy, the `task_start` or `task_done` event that is last in event order among all task events the buddy has received. Kept outside the event window.
- **Event order**: sort by `at`, then by kind order `prompt`, `task_start`, `permission`, `task_done`, `stop`, `idle`, then by arrival order.
- **Arrival sequence**: a number the relay gives each accepted event in the order it accepts or replays it.
- **Status text**: the text shown next to a buddy, from the latest event (in event order) that carries text.
- **Relay**: the `agentbuddy` HTTP server.
- **Port**: `AGENTBUDDY_PORT` if it is a valid port number, else `4343`.
- **Spec path**: the `spec_name` value from a Kiro task event, an absolute path to a `tasks.md`.
- **Code point**: a Unicode code point, never a UTF-16 unit.

---

## Requirement 1: BuddyEvent format and validation

**User story:** As a developer of AgentBuddy, I want one validated event shape, so that the hook, relay and UI agree on what an event is.

### Acceptance criteria
1. THE core SHALL define `BuddyEvent` exactly as in events.md: `v: 1`, `agent` in {`kiro`, `claude`, `codex`}, `session` (non-empty string), `kind` in {`prompt`, `task_start`, `task_done`, `permission`, `idle`, `stop`}, `at` (ISO 8601 time string), `cwd` (non-empty string), optional `text`, optional `task` = { `name`, `specPath`, optional `success` boolean }.
2. THE core SHALL provide a validation function that takes any value and returns either a valid `BuddyEvent` or `null`, and never throws.
3. WHEN `text` or `task.name` is longer than 120 code points, THE validation function SHALL reject the value.
4. WHEN `at` does not parse as a time, THE validation function SHALL reject the value.
5. WHEN `kind` is `task_start` or `task_done` and `task` is missing, THE validation function SHALL reject the value.
6. WHEN a value has properties not listed in criterion 1, THE validation function SHALL return a `BuddyEvent` without them.

## Requirement 2: Kiro normalization

**User story:** As a Kiro user, I want my Kiro hook events turned into BuddyEvents, so that my Kiro buddy shows what Kiro is doing.

### Acceptance criteria
1. WHEN `hook_event_name` = `UserPromptSubmit`, THE Kiro normalizer SHALL return kind `prompt` with `text` = truncated `prompt`.
2. WHEN `hook_event_name` = `PreTaskExec`, THE Kiro normalizer SHALL return kind `task_start` with `task` = { `name`: truncated `task_name`, `specPath`: `spec_name` }.
3. WHEN `hook_event_name` = `PostTaskExec`, THE Kiro normalizer SHALL return kind `task_done` with `task` = { `name`: truncated `task_name`, `specPath`: `spec_name`, `success`: `task_success` }.
4. WHEN `hook_event_name` = `Stop`, THE Kiro normalizer SHALL return kind `stop` with no `text` (events.md trap 5).
5. THE Kiro normalizer SHALL set `session` from `session_id` and `cwd` from `cwd`.
6. WHEN `PostTaskExec` has no boolean `task_success`, THE Kiro normalizer SHALL omit `task.success`. (UNVERIFIED: only `true` was observed.)
7. WHEN `PreTaskExec` or `PostTaskExec` lacks a non-empty string `task_name` or `spec_name`, THE Kiro normalizer SHALL return `null`. (UNVERIFIED.)
8. WHEN `hook_event_name` is any other value, THE Kiro normalizer SHALL return `null`. This includes any approval or idle signal, which events.md lists as not observed for Kiro.

## Requirement 3: Claude Code normalization

**User story:** As a Claude Code user, I want my Claude hook events turned into BuddyEvents, so that my Claude buddy shows when it works, waits for approval, finishes or goes idle.

### Acceptance criteria
1. WHEN `hook_event_name` = `UserPromptSubmit`, THE Claude normalizer SHALL return kind `prompt` with `text` = truncated `prompt`.
2. WHEN `hook_event_name` = `Notification` and `notification_type` = `permission_prompt`, THE Claude normalizer SHALL return kind `permission` with no `text`.
3. WHEN `hook_event_name` = `Notification` and `notification_type` = `idle_prompt`, THE Claude normalizer SHALL return kind `idle` with no `text`.
4. WHEN `hook_event_name` = `Notification` and `notification_type` is any other value or missing, THE Claude normalizer SHALL return `null`.
5. WHEN `hook_event_name` = `Stop`, THE Claude normalizer SHALL return kind `stop` with `text` = truncated `last_assistant_message`, whatever the value of `stop_hook_active`. (UNVERIFIED: only `false` was observed.)
6. THE Claude normalizer SHALL set `session` from `session_id` and `cwd` from `cwd`.
7. WHEN `hook_event_name` is any other value (for example `PreToolUse`, `SessionStart`, `SessionEnd`), THE Claude normalizer SHALL return `null`. (UNVERIFIED.)

## Requirement 4: Codex normalization

**User story:** As a Codex user, I want Codex finished turns turned into BuddyEvents, and its hidden title turns ignored, so that my Codex buddy reflects only my real work.

### Acceptance criteria
1. WHEN `type` = `agent-turn-complete`, THE Codex normalizer SHALL return kind `stop` with `session` = `thread-id`, `cwd` = `cwd`, and `text` = truncated `last-assistant-message`.
2. WHEN the last item of `input-messages` starts with `Generate a concise, single-line task title`, THE Codex normalizer SHALL return `null` (events.md trap 1).
3. WHEN `last-assistant-message`, after trimming whitespace, parses as a JSON object that has a `title` property, THE Codex normalizer SHALL return `null` (events.md trap 1).
4. THE Codex normalizer SHALL drop the event when either signal in criteria 2 or 3 matches, and SHALL NOT require both.
5. THE Codex normalizer SHALL look only at the last item of `input-messages` (events.md trap 2). WHEN `input-messages` is missing or empty, only the signal in criterion 3 applies.
6. WHEN `type` is any other value, THE Codex normalizer SHALL return `null`. (UNVERIFIED.)
7. THE Codex normalizer SHALL never return kinds `prompt`, `task_start`, `task_done`, `permission` or `idle`.

## Requirement 5: Normalization safety

**User story:** As a developer running agents, I want normalization to survive any input, so that a strange payload can never break my agent's hook.

### Acceptance criteria
1. THE normalizers SHALL accept a raw string, parse it as JSON themselves, and return `null` for unparsable input, non-objects, arrays and `null`.
2. THE normalizers SHALL never throw for any input string or JSON value.
3. THE normalizers SHALL return either `null` or a value that passes the Requirement 1 validation.
4. THE normalizers SHALL take the event time `at` as a parameter and SHALL NOT read the clock.
5. WHEN `session_id` (Kiro, Claude) or `thread-id` (Codex) is missing, empty or not a string, THE normalizers SHALL return `null`.
6. WHEN `cwd` is missing, empty or not a string, THE normalizers SHALL return `null`.
7. WHEN a text source field (`prompt`, `last_assistant_message`, `last-assistant-message`) is missing, not a string, or empty after whitespace normalization, THE normalizers SHALL omit `text` and still return the event.

## Requirement 6: Text truncation

**User story:** As a user, I want only short text to leave the hook process, so that full prompts and replies are never stored or shown.

### Acceptance criteria
1. THE core SHALL provide a truncation function that returns text of at most 120 code points.
2. THE truncation function SHALL replace each run of whitespace (including newlines and tabs) with one space and trim both ends.
3. WHEN the result is longer than 120 code points, THE truncation function SHALL keep the first 119 code points and append `…` (U+2026).
4. THE truncation function SHALL never split a surrogate pair.
5. THE hook command SHALL apply truncation to `text` and `task.name` before the event leaves the process.

## Requirement 7: Buddy identity

**User story:** As a Kiro user, I want one buddy per agent and project folder, because Kiro starts a new session for every task run (events.md trap 6).

### Acceptance criteria
1. THE core SHALL assign each event to the buddy identified by its `agent` and its exact `cwd` string.
2. THE core SHALL NOT use `session` to split buddies.
3. THE core SHALL derive the display name as `<Agent> @ <folder name>`, where the folder name is the last non-empty segment of `cwd`, or `cwd` itself when it has none (for example `/`).
4. THE core SHALL keep, per buddy, the `session` of the latest event in event order.
5. Known limit: two windows of the same agent in the same folder merge into one buddy and show whichever event is latest. THE README SHALL state this limit.

## Requirement 8: Event window and ordering

**User story:** As a user, I want out-of-order hook calls to give the same state as in-order ones, because each hook call is a separate process.

### Acceptance criteria
1. THE core SHALL keep, per buddy, an event window of the latest 50 events in event order.
2. WHEN an event arrives, THE core SHALL insert it at its place in event order, drop the earliest event if the window then holds more than 50, and recompute the buddy state from the start of the window.
3. THE core SHALL never ignore an event for being older than an event already applied. An event is left out only when it falls outside the latest 50.
4. THE core SHALL take the arrival sequence as a parameter and SHALL NOT read the clock.
5. FOR any set of events in which no two events of one buddy share both `at` and kind, applying them in any arrival order SHALL give the same buddy state as applying them in event order.
6. THE core SHALL keep, per buddy and outside the event window, the latest task event, and SHALL replace it only with a task event that is later in event order.
7. FOR any set of events in which no two events of one buddy share both `at` and kind, the kept latest task event SHALL be the same in any arrival order, and SHALL stay after any number of later events, including after it has left the event window.

## Requirement 9: Event-driven state rules

**User story:** As a user, I want each buddy's state to follow only what the agent reported, so that the list never shows a state that was not observed.

### Acceptance criteria
1. WHEN the fold reaches a `prompt` or `task_start` event, THE core SHALL set the state to `WORKING`.
2. WHEN the fold reaches a `permission` event, THE core SHALL set the state to `WAITING_APPROVAL`.
3. WHEN the fold reaches a `stop` event, THE core SHALL set the state to `TURN_DONE`.
4. WHEN the fold reaches an `idle` event, THE core SHALL set the state to `IDLE`.
5. WHEN the fold reaches a `task_done` event, THE core SHALL keep the state.
6. WHEN the first event of the window is `task_done`, THE core SHALL set the state to `WORKING`.
7. THE core SHALL enter `WAITING_APPROVAL` only through `permission`, and `TURN_DONE` only through `stop`.
8. WHEN the state is `WAITING_APPROVAL` and the fold reaches an `idle`, `prompt` or `stop` event, THE core SHALL leave `WAITING_APPROVAL` (events.md trap 3).
9. THE core SHALL set the status text from the latest event in the window that carries text: `text`, or `task.name` for task events. Events without text keep the earlier status text, so a Kiro `stop` keeps the preceding prompt's text.
10. FOR Kiro buddies, THE core SHALL set the buddy's spec path from the latest task event (Requirement 8.6), so long chats after a task run keep the spec path.
11. THE fold SHALL be a pure function of the window and the latest task event.

## Requirement 10: Time-based states

**User story:** As a user, I want buddies that go quiet to show it, so that I notice stuck or finished agents I forgot about.

### Acceptance criteria
1. THE core SHALL provide a pure function that takes a buddy state and the current time `now` and returns the displayed state.
2. "Last event time" SHALL mean the latest `at` in the buddy's window.
3. WHILE the state is `TURN_DONE` and the last event time is 10 minutes or more before `now`, THE function SHALL return `IDLE`.
4. WHILE the state is `WORKING` or `WAITING_APPROVAL` and the last event time is 10 minutes or more before `now`, THE function SHALL return `STALE`.
5. WHEN the last event time is 30 minutes or more before `now`, THE function SHALL return `OFFLINE`, whatever the state.
6. WHEN the last event time is later than `now`, THE function SHALL treat the age as zero.
7. THE relay SHALL re-evaluate displayed states at least every 30 seconds and send changes to the UI.
8. FOR Codex buddies, the reachable displayed states SHALL be only `TURN_DONE`, `IDLE` and `OFFLINE`.

## Requirement 11: Progress from tasks.md

**User story:** As a Kiro user, I want my buddy to show `task n/m` from the spec's `tasks.md`, so that I see spec progress without opening the file.

### Acceptance criteria
1. THE core SHALL provide a pure function that takes `tasks.md` text and returns `{ done, total }`.
2. THE function SHALL treat as a task every line that starts at column 0 with `- [`, one character, and `]`.
3. THE function SHALL count a task as done only when that character is `x` or `X`.
4. WHEN `*` follows `]` directly, THE function SHALL count the task toward `total` only when it is done.
5. THE function SHALL ignore indented lines, so sub-tasks never count.
6. THE function SHALL handle `\n` and `\r\n` line endings the same way.
7. FOR any input text, the result SHALL satisfy `0 <= done <= total`.
8. Observed in three sample specs on 2026-11-12: only `- [ ]` and `- [x]` at the top level and indented `- [x]` sub-tasks. Observed in this spec during a task run on 2026-11-12 (Kiro IDE 1.4.121): the running task was `- [-]`, finished tasks `- [x]`, not-started tasks `- [ ]`; all fit criteria 2–3. The marker of task 11 after it finished is PENDING, to be recorded at the start of task 12. `- [~]`, `X` and `*` are UNVERIFIED; criteria 2–4 cover them without special cases.

## Requirement 12: Hook command input

**User story:** As a developer, I want one hook command for all three agents, so that setup is the same everywhere.

### Acceptance criteria
1. THE hook command SHALL be invoked as `agentbuddy-hook <agent>` with `<agent>` in {`kiro`, `claude`, `codex`}.
2. WHEN `<agent>` is `kiro` or `claude`, THE hook command SHALL read the raw payload from stdin and wait for it at most 500 ms.
3. WHEN `<agent>` is `codex`, THE hook command SHALL take the raw payload from the last command-line argument and SHALL NOT read stdin.
4. THE hook command SHALL stamp `at` with the current time once, at process start, before reading input.
5. WHEN `<agent>` is missing or unknown, THE hook command SHALL log the error and exit 0.
6. WHEN normalization returns `null`, THE hook command SHALL send nothing and exit 0 without logging an error.
7. THE hook command SHALL have no runtime dependencies beyond Node 20+.

## Requirement 13: Hook command never blocks

**User story:** As a developer, I want the hook to never slow down or break my agent, even when the relay is down.

### Acceptance criteria
1. THE hook command SHALL always exit with code 0.
2. THE hook command SHALL exit within 900 ms of process start in every case, so it finishes within 1 second.
3. THE hook command SHALL abort the POST after 300 ms.
4. WHEN any error occurs (no token file, relay down, timeout, non-2xx reply, write failure), THE hook command SHALL append one line to `~/.agentbuddy/hook-errors.log` and exit 0.
5. WHEN writing to `hook-errors.log` fails, THE hook command SHALL ignore that failure and exit 0.
6. THE hook command SHALL write nothing to stdout or stderr, so that it never alters agent hook output.
7. THE hook command SHALL never write raw payloads, event text or the token to `hook-errors.log`.

## Requirement 14: Hook command delivery

### Acceptance criteria
1. THE hook command SHALL POST the normalized event as JSON to `http://127.0.0.1:<port>/events`.
2. THE hook command SHALL read the token from `~/.agentbuddy/token` and send it in the `X-AgentBuddy-Token` header.
3. THE hook command SHALL make no network call other than this POST.

## Requirement 15: Relay binding and access control

**User story:** As a user, I want the relay reachable only from my own machine and only by my own hooks, so that web pages cannot inject or read events.

### Acceptance criteria
1. THE relay SHALL listen on `127.0.0.1:<port>` only, never on `0.0.0.0` or another interface.
2. WHEN the relay starts and `~/.agentbuddy/token` does not exist, THE relay SHALL create `~/.agentbuddy/` (mode 700) and a token of 32 random bytes from a cryptographic source, stored with file mode 600.
3. WHEN any request has a `Host` header other than `127.0.0.1:<port>` or `localhost:<port>`, THE relay SHALL reply 403.
4. WHEN a `POST /events` request has an `Origin` header, THE relay SHALL reply 403.
5. WHEN a `POST /events` request has a missing or wrong `X-AgentBuddy-Token`, THE relay SHALL reply 401. The comparison SHALL be constant-time.
6. WHEN a `POST /events` body is larger than 16 KB, THE relay SHALL reply 413.
7. THE relay SHALL make no outbound network calls.
8. THE relay SHALL send no CORS headers.

## Requirement 16: Relay event intake and daily log

### Acceptance criteria
1. WHEN `POST /events` passes Requirement 15, THE relay SHALL validate the body with the Requirement 1 validation and reply 400 if it is not a valid `BuddyEvent`.
2. WHEN the body is a valid `BuddyEvent`, THE relay SHALL append it as one JSON line to `~/.agentbuddy/events-YYYY-MM-DD.jsonl`, where the date is the relay's local date when it accepts the event, apply it to the in-memory state, and reply 204.
3. THE relay SHALL log every accepted event, including events that fall outside a buddy's window.
4. THE relay SHALL create each daily log with file mode 600.
5. WHEN appending to the log fails, THE relay SHALL still apply the event to memory and keep running.

## Requirement 17: Restore on start

**User story:** As a user, I want my buddies back after restarting the relay, so that a restart does not wipe what my agents were doing.

### Acceptance criteria
1. WHEN the relay starts, THE relay SHALL read the daily logs for yesterday and today (local dates), yesterday's file first.
2. THE relay SHALL keep only lines that pass the Requirement 1 validation and whose `at` is within 24 hours before the start time, and skip all other lines.
3. THE relay SHALL apply the kept events with the same core functions as live events, giving arrival sequences in file order.
4. AFTER replay, THE relay SHALL read progress once for each Kiro buddy that has a spec path.
5. WHEN a log file is missing or unreadable, THE relay SHALL skip it and keep starting.

## Requirement 18: Live stream

**User story:** As a user, I want the buddy list to update by itself, so that I never reload the page.

### Acceptance criteria
1. THE relay SHALL offer a Server-Sent Events endpoint for the UI.
2. WHEN a client connects, THE relay SHALL first send the full current buddy list.
3. WHEN the buddy list changes (new event, progress update, or displayed-state change), THE relay SHALL send the full list to every connected client.
4. THE relay SHALL send a comment line to each client at least every 25 seconds.
5. THE relay SHALL serve the built UI from the same origin.

## Requirement 19: Kiro progress reading

**User story:** As a Kiro user, I want progress recomputed whenever a task may have changed, including tasks done by chatting (events.md trap 4).

### Acceptance criteria
1. WHEN the relay accepts a Kiro `task_start`, `task_done` or `stop` event and the buddy has a spec path, THE relay SHALL read that `tasks.md` and update the buddy's progress with the Requirement 11 function.
2. THE relay SHALL read the file only if its real path, with symlinks resolved, is inside the buddy's real `cwd` and ends with `/.kiro/specs/<name>/tasks.md`, where `<name>` is one path segment.
3. THE relay SHALL read the file only if it is a regular file of at most 1 MB.
4. WHEN the file is missing, unreadable or rejected by criteria 2–3, THE relay SHALL set the buddy's progress to unknown.
5. WHEN a Kiro buddy has no spec path, THE relay SHALL leave its progress unknown and read no file.
6. THE relay SHALL never read `tasks.md` for Claude Code or Codex buddies.

## Requirement 20: Minimal text-only UI

**User story:** As the builder, I want a plain list that proves the pipeline works, before the messenger design spec.

### Acceptance criteria
1. THE UI SHALL show one row per buddy with: display name, displayed state, status text, progress, last event time, latest session (first 8 code points), and full `cwd`.
2. FOR Kiro buddies, THE UI SHALL show `task n/m` when progress is known and `progress unknown` otherwise.
3. FOR `STALE` buddies, THE UI SHALL show the state as `?`.
4. FOR Codex buddies, THE UI SHALL show `Codex reports finished turns only`.
5. THE UI SHALL insert all agent-provided text with `textContent`, never `innerHTML`.
6. WHEN the stream disconnects, THE UI SHALL show `relay disconnected` and keep retrying; WHEN a new list arrives, it SHALL hide that notice.
7. THE UI SHALL use no styling beyond browser defaults, and English text only.

## Requirement 21: Tests and fixtures

### Acceptance criteria
1. THE tests SHALL use the raw payload examples from events.md verbatim as fixtures in `tests/fixtures/`.
2. EACH fixture SHALL be labeled **observed** or **derived**:
   - observed, verbatim: Kiro `UserPromptSubmit`, `PreTaskExec`, `PostTaskExec`, `Stop`; Claude `UserPromptSubmit`, `Notification` `permission_prompt`, `Stop`; Codex `agent-turn-complete`; Codex title turn.
   - observed: Claude `Notification` `idle_prompt`, built from the Claude `Notification` example with the observed `message` and `notification_type` values.
   - derived: Claude `Notification` with another type, and "anything else" inputs (unparsable text, unknown event names).
3. THE unit tests SHALL include one test per row of the events.md mapping table (12 rows).
4. THE property tests SHALL cover every property under "Testing expectations" in tech.md.
5. THE fixtures and tests SHALL contain no real home paths, user names, session IDs or tokens. Sample `tasks.md` texts in tests SHALL be written for this project, not copied from other projects.

---

## Unverified behavior (handled conservatively)

| Case | Source | Handling |
|---|---|---|
| Kiro approval signal | events.md: not observed | none; Kiro never enters `WAITING_APPROVAL` |
| Kiro idle signal | events.md: none | `IDLE` only by the 10-minute rule |
| Kiro `task_success: false` or missing | only `true` observed | pass `false` through; omit when missing |
| Kiro task event without `task_name` / `spec_name` | not observed | dropped |
| Kiro hook events other than the four | not recorded | dropped |
| Claude `Stop` with `stop_hook_active: true` | only `false` observed | normalized like any `Stop` |
| Claude `Notification` types other than the two | not recorded | dropped (events.md rule) |
| Claude `PreToolUse`, `SessionStart`, `SessionEnd`, others | not recorded | dropped |
| Codex `notify` types other than `agent-turn-complete` | not recorded | dropped |
| Session end ("logging off") for any agent | not recorded | `OFFLINE` only by the 30-minute rule |
| `tasks.md` markers `- [-]`, `- [~]`, `- [X]`, `*` | not in samples | counted by the general rule in Requirement 11 |

## Decisions (confirmed 2026-11-12)
- Buddy = agent + `cwd`; same-folder windows merge (known limit).
- Per-buddy window of 50 events, recomputed from the start; late events are inserted, never ignored. Kind order breaks `at` ties, then arrival order.
- Each buddy keeps its latest task event outside the window; the Kiro spec path comes from it. Only a later task event (in event order) replaces it.
- Hook timing: Codex reads argv only; stdin wait 500 ms; POST timeout 300 ms; forced exit at 900 ms.
- Restore from the last 24 hours of daily logs `events-YYYY-MM-DD.jsonl`.
- Port `4343`, overridable with `AGENTBUDDY_PORT`.
- Spec path is read only when its real path is inside the buddy's real `cwd` and has the form `.kiro/specs/<name>/tasks.md`.
- Assumptions A1–A9 from the first draft approved: truncation to 119 code points + `…`, whitespace collapse, `task_done`-first starts `WORKING`, log every accepted event, `Host` header check, 16 KB body limit, `cwd` required, plain status text.
