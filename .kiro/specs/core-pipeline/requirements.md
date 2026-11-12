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
- **Buddy**: one **agent + session folder** pair (events.md "Buddies and sessions"). It groups the sessions of that agent whose fixed folder is that exact string.
- **Session**: one conversation window, keyed by **agent + `session`** (Kiro/Claude `session_id`, Codex `thread-id`). Each session has its own state.
- **Session folder**: fixed per session: Claude `projectDir` (`CLAUDE_PROJECT_DIR`) if the session reports it, else the `cwd` of its earliest event.
- **Display name**: `<Agent> @ <folder name>`, with agent names `Kiro`, `Claude Code`, `Codex` and the folder name being the last segment of `cwd`.
- **Session name**: the session's first prompt text; for Codex, its first `firstInput`; else its first task name; else its start time. Cut to 40 code points.
- **Urgency order**: `WAITING_APPROVAL` > `WORKING` > `STALE` > `TURN_DONE` > `IDLE` > `OFFLINE`.
- **Event window**: the latest 50 events of one session, sorted by event order.
- **Latest task event**: per buddy, the `task_start` or `task_done` event that is last in event order among all task events of all its sessions. Kept outside the event windows.
- **Event order**: sort by `at`, then by kind order `prompt`, `task_start`, `permission`, `task_done`, `stop`, `idle`, then by `session`, then by arrival order.
- **Arrival sequence**: a number the relay gives each accepted event in the order it accepts or replays it.
- **Status text**: the text shown for a session, from its latest event (in event order) that carries text.
- **Relay**: the `agentbuddy` HTTP server.
- **Port**: `AGENTBUDDY_PORT` if it is a valid port number, else `4343`.
- **Spec path**: the `spec_name` value from a Kiro task event, an absolute path to a `tasks.md`.
- **Code point**: a Unicode code point, never a UTF-16 unit.

---

## Requirement 1: BuddyEvent format and validation

**User story:** As a developer of AgentBuddy, I want one validated event shape, so that the hook, relay and UI agree on what an event is.

### Acceptance criteria
1. THE core SHALL define `BuddyEvent` exactly as in events.md: `v: 1`, `agent` in {`kiro`, `claude`, `codex`}, `session` (non-empty string), `kind` in {`prompt`, `task_start`, `task_done`, `permission`, `idle`, `stop`, `end`}, `at` (ISO 8601 time string), `cwd` (non-empty string), optional `text`, optional `task` = { `name`, `specPath`, optional `success` boolean }, optional `firstInput`.
2. THE core SHALL provide a validation function that takes any value and returns either a valid `BuddyEvent` or `null`, and never throws.
3. WHEN `text`, `task.name` or `firstInput` is longer than 120 code points, THE validation function SHALL reject the value.
4. WHEN `at` does not parse as a time, THE validation function SHALL reject the value.
5. WHEN `kind` is `task_start` or `task_done` and `task` is missing, THE validation function SHALL reject the value.
6. WHEN a value has properties not listed in criterion 1, THE validation function SHALL return a `BuddyEvent` without them. `firstInput` SHALL be kept only on Codex `stop` events.

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
7. WHEN `hook_event_name` is any other value (for example `PreToolUse`, `SessionStart`), THE Claude normalizer SHALL return `null`. (UNVERIFIED.)
8. WHEN `hook_event_name` = `SessionEnd`, THE Claude normalizer SHALL return kind `end`, whatever the `reason` (observed: `other`).

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
8. WHEN the first item of `input-messages` is a string that is not empty after truncation, THE Codex normalizer SHALL set `firstInput` to that item, truncated to 120 code points (events.md trap 2). Otherwise it SHALL omit `firstInput`. Title turns are still dropped by criteria 2–4.

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
5. THE hook command SHALL apply truncation to `text`, `task.name` and `firstInput` before the event leaves the process.

## Requirement 7: Buddy and session identity

**User story:** As a developer who runs several sessions of one agent in one folder, I want each session tracked on its own and grouped under one buddy per agent and folder, so that one session waiting for approval is never hidden by another that is working.

### Acceptance criteria
1. THE core SHALL assign each event to the session identified by its `agent` and its `session`; `cwd` SHALL NOT be part of the session key.
2. THE core SHALL fix each session's folder: the `projectDir` of its earliest event that has one (Claude), else the `cwd` of its earliest event; and SHALL group sessions into the buddy identified by `agent` and that folder.
3. THE core SHALL derive the buddy display name as `<Agent> @ <folder name>`, where the folder name is the last non-empty segment of the folder, or the folder itself when it has none (for example `/`).
4. THE core SHALL never let an event of one session change the state, status text or name of another session.
5. Kiro starts a new session for every task run (events.md trap 6), so a Kiro buddy collects many sessions; Requirement 23 keeps the list short.
6. FOR any set of events, every session SHALL belong to exactly one buddy, the one of its fixed folder, in any arrival order, even when its `cwd` changes mid-session.
7. WHEN the Claude hook process has `CLAUDE_PROJECT_DIR` set, THE hook command SHALL send it as `projectDir` on the event; THE validation function SHALL keep `projectDir` on Claude events only.

## Requirement 8: Event window and ordering

**User story:** As a user, I want out-of-order hook calls to give the same state as in-order ones, because each hook call is a separate process.

### Acceptance criteria
1. THE core SHALL keep, per session, an event window of the latest 50 events in event order.
2. WHEN an event arrives, THE core SHALL insert it at its place in its session's window, drop the earliest event if the window then holds more than 50, and recompute that session's state from the start of the window.
3. THE core SHALL never ignore an event for being older than an event already applied. An event is left out of a window only when it falls outside the latest 50.
4. THE core SHALL take the arrival sequence as a parameter and SHALL NOT read the clock.
5. FOR any set of events in which no two events of one session share both `at` and kind, applying them in any arrival order SHALL give the same session states and buddy states as applying them in event order.
6. THE core SHALL keep, per buddy and outside the event windows, the latest task event of all its sessions, and SHALL replace it only with a task event that is later in event order.
7. FOR any set of events in which no two events of one session share both `at` and kind, the kept latest task event SHALL be the same in any arrival order, and SHALL stay after any number of later events, including after it has left its session's window.

## Requirement 9: Event-driven state rules

**User story:** As a user, I want each session's state to follow only what the agent reported, so that the list never shows a state that was not observed.

### Acceptance criteria
1. WHEN the fold of a session reaches a `prompt` or `task_start` event, THE core SHALL set the session state to `WORKING`.
2. WHEN the fold reaches a `permission` event, THE core SHALL set the session state to `WAITING_APPROVAL`.
3. WHEN the fold reaches a `stop` event, THE core SHALL set the session state to `TURN_DONE`.
4. WHEN the fold reaches an `idle` event, THE core SHALL set the session state to `IDLE`.
5. WHEN the fold reaches a `task_done` event, THE core SHALL keep the session state.
6. WHEN the first event of a session's window is `task_done`, THE core SHALL set the session state to `WORKING`.
7. THE core SHALL enter `WAITING_APPROVAL` only through `permission`, and `TURN_DONE` only through `stop`.
8. WHEN a session is `WAITING_APPROVAL` and its fold reaches an `idle`, `prompt` or `stop` event, THE core SHALL leave `WAITING_APPROVAL` (events.md trap 3).
9. THE core SHALL set a session's status text from the latest event in its window that carries text: `text`, or `task.name` for task events. Events without text keep the earlier status text, so a Kiro `stop` keeps the preceding prompt's text.
10. FOR Kiro buddies, THE core SHALL set the buddy's spec path from the buddy's latest task event (Requirement 8.6), so long chats and new task-run sessions keep the spec path.
11. THE session fold SHALL be a pure function of the session's window and its kept earliest events (Requirement 23.1).
12. WHEN the fold of a session reaches an `end` event, THE core SHALL set the session state to `ENDED`. Events after it in event order apply by the rules above, so a later event of the same session brings it back; earlier or same-time events never do, because `end` sorts last on `at` ties.

## Requirement 10: Time-based states

**User story:** As a user, I want sessions that go quiet to show it, so that I notice stuck or finished agents I forgot about.

### Acceptance criteria
1. THE core SHALL provide a pure function that takes a session state and the current time `now` and returns the session's displayed state.
2. "Last event time" of a session SHALL mean the latest `at` in its window.
3. WHILE a session is `TURN_DONE` and its last event time is 10 minutes or more before `now`, THE function SHALL return `IDLE`.
4. WHILE a session is `WORKING` or `WAITING_APPROVAL` and its last event time is 10 minutes or more before `now`, THE function SHALL return `STALE`.
5. WHEN a session's last event time is 30 minutes or more before `now`, THE function SHALL return `OFFLINE`, whatever the state.
6. WHEN the last event time is later than `now`, THE function SHALL treat the age as zero.
7. THE relay SHALL re-evaluate displayed states at least every 30 seconds and send changes to the UI.
8. FOR Codex sessions, the reachable displayed states SHALL be only `TURN_DONE`, `IDLE` and `OFFLINE`.
9. WHEN a session is `ENDED`, THE function SHALL return `OFFLINE`, whatever the time.
10. FOR any session whose events include an `end`, every event of that session with an `at` no later than the `end` SHALL leave its displayed state `OFFLINE`, in any arrival order.

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
8. Observed in three sample specs on 2026-11-12: only `- [ ]` and `- [x]` at the top level and indented `- [x]` sub-tasks. Observed in this spec during a task run on 2026-11-12 (Kiro IDE 1.4.121): the running task was `- [-]`, finished tasks `- [x]`, not-started tasks `- [ ]`; all fit criteria 2–3. The marker of task 11 after it finished was `- [x]`. A running sub-task is marked `[-]` on its own line only; when the last sub-task of task 16 finished, the sub-task and task 16 were both `[x]`. `- [~]`, `X` and `*` are UNVERIFIED; criteria 2–4 cover them without special cases.

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
3. THE relay SHALL log every accepted event, including events that fall outside a session's window or belong to a removed session.
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
3. WHEN the buddy list changes (new event, progress update, displayed-state change, or session removal), THE relay SHALL send the full list to every connected client.
4. THE relay SHALL send a comment line to each client at least every 25 seconds.
5. THE relay SHALL serve the built UI from the same origin.
6. EACH buddy in the list SHALL carry its sessions, each with a stable session key and its displayed state, so that a later spec can notify per session.

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
1. THE UI SHALL show one row per buddy with: display name, buddy state, status text of the session that set the buddy state, progress, last event time, number of sessions (and how many are hidden), and full `cwd`.
2. FOR Kiro buddies, THE UI SHALL show `task n/m` when progress is known and `progress unknown` otherwise.
3. FOR `STALE` buddies and sessions, THE UI SHALL show the state as `?`.
4. FOR Codex buddies, THE UI SHALL show `Codex reports finished turns only`.
5. THE UI SHALL insert all agent-provided text with `textContent`, never `innerHTML`.
6. WHEN the stream disconnects, THE UI SHALL show `relay disconnected` and keep retrying; WHEN a new list arrives, it SHALL hide that notice.
7. THE UI SHALL use no styling beyond browser defaults, and English text only.
8. A buddy row SHALL be collapsed by default and SHALL expand to one row per session with: session name (or `started HH:MM:SS` when it has none), session state, status text, last event time, and short session ID (first 8 code points).
9. WHEN a buddy is expanded, THE UI SHALL hide its `IDLE` and `OFFLINE` sessions by default and offer a control to show them.
10. THE UI SHALL keep each buddy's expanded and show-hidden choices when a new list arrives.

## Requirement 21: Tests and fixtures

### Acceptance criteria
1. THE tests SHALL use the raw payload examples from events.md verbatim as fixtures in `tests/fixtures/`.
2. EACH fixture SHALL be labeled **observed** or **derived**:
   - observed, verbatim: Kiro `UserPromptSubmit`, `PreTaskExec`, `PostTaskExec`, `Stop`; Claude `UserPromptSubmit`, `Notification` `permission_prompt`, `Stop`; Codex `agent-turn-complete`; Codex title turn.
   - observed: Claude `Notification` `idle_prompt`, built from the Claude `Notification` example with the observed `message` and `notification_type` values.
   - derived: Claude `Notification` with another type, and "anything else" inputs (unparsable text, unknown event names).
3. THE unit tests SHALL include one test per row of the events.md mapping table (13 rows), and one test that the observed Codex `agent-turn-complete` fixture names its session from `firstInput`.
4. THE property tests SHALL cover every property under "Testing expectations" in tech.md.
5. THE fixtures and tests SHALL contain no real home paths, user names, session IDs or tokens. Sample `tasks.md` texts in tests SHALL be written for this project, not copied from other projects.

## Requirement 22: Buddy state from sessions

**User story:** As a user, I want a buddy to show its most urgent session, so that a session waiting for my OK is never hidden by another session of the same agent.

### Acceptance criteria
1. THE core SHALL provide a pure function that takes the displayed states of a buddy's sessions and returns the buddy state: the most urgent one in urgency order (`WAITING_APPROVAL` > `WORKING` > `STALE` > `TURN_DONE` > `IDLE` > `OFFLINE`).
2. FOR any non-empty set of sessions, the buddy state SHALL be the displayed state of one of them, and no session of that buddy SHALL be more urgent.
3. THE buddy's status text SHALL be the status text of the most urgent session; among equally urgent sessions, the one with the latest last event time, then the smallest session key.
4. THE buddy's last event time SHALL be the latest last event time of its sessions.
5. THE core SHALL list a buddy's sessions by urgency, then latest last event time first, then session key.

## Requirement 23: Session names and removal

**User story:** As a user, I want each conversation window named after what I asked in it, and old ones cleared away, so that a buddy's session list stays readable.

### Acceptance criteria
1. THE core SHALL keep, per session and outside its window, its earliest event, its earliest `prompt` with text, its earliest event with `firstInput`, and its earliest task event, each replaced only by an event that is earlier in event order.
2. THE core SHALL name a session from the first of these that exists: the earliest prompt's `text`; the earliest `firstInput` (Codex); the earliest task event's `task.name`. Each name SHALL be cut to 40 code points with the Requirement 6 function.
3. WHEN none of them exists, THE session SHALL have no name and THE core SHALL give its start time (the earliest event's `at`) so the UI can show `started HH:MM:SS`.
4. FOR any set of events, a session's name and start time SHALL be the same in any arrival order.
5. THE core SHALL provide a pure function that takes the buddy list and `now` and removes every session whose last event time is more than 24 hours before `now`.
6. THE same function SHALL remove a buddy only when it has no sessions left and its latest task event is missing or more than 24 hours before `now`. A buddy with no sessions SHALL not appear in the list sent to the UI.
7. AFTER removal, every remaining session's displayed state and every remaining buddy's state at `now` SHALL be unchanged.
8. THE relay SHALL apply removal after each accepted event, after restore, and on each 30-second tick.

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
| Claude `PreToolUse`, `SessionStart`, others | not recorded | dropped |
| Kiro `SessionEnd` (CLI V3) | not observed | dropped |
| Codex `notify` types other than `agent-turn-complete` | not recorded | dropped |
| Session end ("logging off") for any agent | not recorded | `OFFLINE` only by the 30-minute rule |
| `tasks.md` markers `- [-]`, `- [~]`, `- [X]`, `*` | not in samples | counted by the general rule in Requirement 11 |

## Decisions (confirmed 2026-11-12)
- Two levels: buddy = agent + session folder; session = agent + `session`. A session's folder is fixed (Claude `CLAUDE_PROJECT_DIR`, else its first `cwd`), so `cd` never splits a session. State, window and time rules are per session; the buddy shows its most urgent session. (Replaces the first decision, where sessions of one folder merged into one buddy, and the second, where `cwd` was part of the session key.)
- Per-session window of 50 events, recomputed from the start; late events are inserted, never ignored. Event order: `at`, kind, `session`, then arrival order.
- Each buddy keeps its latest task event outside the windows; the Kiro spec path and progress belong to the buddy. Only a later task event (in event order) replaces it.
- Session names: first prompt → Codex first input (`firstInput`) → first task → start time; cut to 40 code points. Codex stop events carry `firstInput`, the first `input-messages` item.
- Sessions whose last event is more than 24 hours old are removed from memory; a buddy's latest task event is kept for 24 hours.
- UI: buddies collapsed by default; `IDLE` and `OFFLINE` sessions hidden by default when expanded; the start time is formatted in the UI, not in core.
- Hook timing: Codex reads argv only; stdin wait 500 ms; POST timeout 300 ms; forced exit at 900 ms.
- Restore from the last 24 hours of daily logs `events-YYYY-MM-DD.jsonl`.
- Port `4343`, overridable with `AGENTBUDDY_PORT`.
- Spec path is read only when its real path is inside the buddy's real `cwd` and has the form `.kiro/specs/<name>/tasks.md`.
- Assumptions A1–A9 from the first draft approved: truncation to 119 code points + `…`, whitespace collapse, `task_done`-first starts `WORKING`, log every accepted event, `Host` header check, 16 KB body limit, `cwd` required, plain status text.
