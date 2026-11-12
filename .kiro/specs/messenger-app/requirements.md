# Requirements: Messenger App

## Introduction

This spec puts the buddy list into a small desktop window that stays in a corner of the screen, like a 2000s messenger. Agents show up as buddies grouped by project folder. When a session finishes a turn or needs approval, the app plays a "ding", slides up a small retro pop-up from the bottom-right corner, and keeps the ping in an inbox until the user has seen it. Clicking a buddy, a session or a ping brings forward the app that agent runs in.

It builds on the finished core-pipeline spec (`.kiro/specs/core-pipeline/`). That spec's files are not edited. Every criterion of it that this spec changes is listed in the table below. The event contract is still `.kiro/steering/events.md`. Behavior that nobody has observed is marked **UNVERIFIED** and is never guessed.

## Changes to earlier criteria

"Core" means a requirement of the core-pipeline spec. The last column says whether the steering file is already updated.

| # | Earlier criterion | Was | Becomes | Here | Steering |
|---|---|---|---|---|---|
| C1 | Core 1.1; events.md "Normalized event" | `BuddyEvent` fields end with `projectDir` | adds optional `bundleId` and `termProgram`, on events of every agent | Req 1 | events.md updated 2026-11-12 |
| C2 | Core 1.6 | unknown fields dropped; `projectDir` kept on Claude events only | `bundleId` and `termProgram` kept on every agent's events when well-formed; a malformed one rejects the event | Req 1 | events.md updated (form of the values) |
| C3 | Core 7.7, 12 | the hook reads only `CLAUDE_PROJECT_DIR` from its environment | also reads `__CFBundleIdentifier` and `TERM_PROGRAM`, for every agent | Req 1 | events.md updated |
| C4 | Core 18.6; core design `SessionView` | a session view has key, state, status text, times and name | also the session's launcher (`bundleId`, `termProgram`) | Req 1 | not needed |
| C5 | Core 10.9, 10.10; events.md "State rules" (`ENDED` row); tech.md property "after a session's `end` … keep it `OFFLINE`" | `ENDED` is shown as `OFFLINE` at once | `ENDED` is a displayed state of its own, shown as `logged off`, whatever the time | Req 2 | events.md and tech.md updated (task 3) |
| C6 | Core 22.1, 22.3; events.md "Buddies and sessions" (urgency) | `… > IDLE > OFFLINE` | `… > IDLE > OFFLINE = ENDED`; the two share one rank, and the existing tie rule (latest last event) picks between them | Req 2 | events.md and tech.md updated (task 3) |
| C7 | Core 20 (all); core design `src/ui` | unstyled text-only table in a browser | buddy list screen with folder groups, buddy rows and session rows, in the app window; the relay still serves it to a browser, without the app-only features | Req 6 | update structure.md when implemented |
| C8 | Core 20.7 | browser default styles only | styled from the builder's mockups (design phase) | Req 6 | not needed |
| C9 | Core 20.9; events.md "Buddies and sessions" (hidden by default) | `IDLE` and `OFFLINE` sessions hidden by default | also `ENDED` sessions and sessions hidden with × | Req 6, 13 | events.md updated (task 3) |
| C10 | Core 20.1, 20.8 | status shown as plain status text | status line: a messenger phrase for the state, then the status text cut short | Req 7 | not needed |
| C11 | Core design `src/relay/main.ts` | a top-level script that exits 1 when the port is in use and owns SIGINT/SIGTERM | `startRelay()`, used by the `agentbuddy` command and by the app; it never exits the process | Req 3 | update structure.md when implemented |
| C12 | tech.md "Sound" | start audio only after a user gesture | in the app the ding may start without a gesture; the browser page plays no ding in this spec | Req 8 | update when implemented |
| C13 | structure.md "Rules" | only `src/hook` and `src/relay` touch the file system or network | new `src/app` (Electron main process and preloads) also writes `~/.agentbuddy` files, connects to `127.0.0.1:<port>`, and runs `/usr/bin/open` and `/usr/bin/lsappinfo` with `execFile`; only `src/ui` touches the DOM | Req 4, 11, 12, 14 | update when implemented |
| C14 | tech.md "Pieces", "Commands"; product.md core flow step 2 | the relay opens the list in the browser | the desktop app (`npm run app`) starts its own relay or attaches to a running one | Req 4 | update when implemented |
| C15 | README "What is stored" | token, daily logs, hook error log, Codex script | adds `inbox-YYYY-MM-DD.jsonl` and `app-settings.json` | Req 11, 14 | not needed |
| C16 | Core "Out of scope" | ding, pop-up, inbox, settings, hide-text setting and flavor text left for later | in scope here | all | not needed |

## Scope

### In scope
- An Electron app run from source with `npm run app`: a small vertical window with an always-on-top switch, a macOS menu bar icon with a count, and staying in the menu bar when the window is closed.
- `startRelay()`: the relay as a function, started inside the app; attaching to a relay that already runs on the port.
- Buddy list screen: folder groups, buddy rows, session rows, × to hide a session, `logged off` for ended sessions.
- Status lines with messenger phrases, and a setting that hides agent text.
- Pings: synthesized ding, retro pop-up windows that never take focus, an optional macOS notification (off by default), and an inbox kept on this machine that marks what the user has seen.
- Jump: bringing forward the app a session runs in, using `bundleId` and `termProgram` that the hook now sends.

### Out of scope
- Replying to or approving anything for an agent.
- The web demo for judges (`demo/events.json`, `npm run demo`).
- The setup command that prints hook snippets.
- Signing the app. A packaged `.app` is optional and not needed to finish this spec.
- Selecting a terminal tab, and any window selection beyond Req 12.7.
- Deleting old daily logs or inbox files; launch at login; Windows and Linux.

### Given by the builder (2026-11-12)
- Electron, with `contextIsolation` on, `nodeIntegration` off in every window, and only the needed functions exposed through the preloads.
- The relay starts inside the app with `startRelay()`. If a relay already runs on port 4343 (or `AGENTBUDDY_PORT`), the app attaches to it.
- Colors and icons come from the builder's mockups in the design phase.
- Commands for a jump run through `execFile` without a shell, and only bundle IDs in reverse-domain form are allowed. A folder may be passed only under the conditions in Req 12.7.
- The ding is synthesized with Web Audio; no recorded sound files.
- The ping's message window is a retro pop-up window of our own. macOS notifications are an optional extra, off by default.
- "Never block an agent" and "nothing leaves this machine" hold unchanged.
- If an exact terminal tab cannot be selected, a jump only brings the app forward.

## Glossary
- **App**: the Electron desktop app started with `npm run app`. **Main process**: its Node side. **Main window**: its buddy list window, showing `src/ui`. **Pop-up**: a small window for one ping (Req 9). **Preload**: the script that gives a window its few allowed functions.
- **Own relay**: a relay the app started with `startRelay()`. **Attached relay**: a relay that was already running on the port, which the app only reads from.
- **List**: the `BuddyView[]` the relay sends on its stream (core Req 18).
- **Group**: all buddies whose session folder is the same path.
- **Buddy row**, **session row**: one line in the main window for a buddy, and one for each of its sessions.
- **Status line**: the text of a buddy row or session row: a phrase for the state, then the status text cut short (Req 7).
- **Attention state**: `WAITING_APPROVAL` or `TURN_DONE`.
- **Ping**: a session entering an attention state, found by comparing two lists one after the other (Req 8).
- **Baseline list**: the first list after the app connects or reconnects to a relay. It never pings.
- **Inbox entry**: the record of one ping (Req 11). It is **unacknowledged** until the user has seen it (Req 10).
- **Unacknowledged finished turn**: a `TURN_DONE` session whose latest entry is unacknowledged (Req 10.5).
- **Menu bar count**: `WAITING_APPROVAL` sessions plus unacknowledged finished turns (Req 5.3).
- **Launcher**: the `bundleId` and `termProgram` of a session (Req 1).
- **Jump**: bringing forward the app a session runs in (Req 12).
- **Hidden session**: a session the user hid with × (Req 13).
- **Hide-text setting**: the setting that keeps all agent text off the screen (Req 7.4).

---

## Requirement 1: Launcher fields on events

**User story:** As a user, I want each event to say which app the agent runs in, so that a click can bring that app forward.

### Acceptance criteria
1. THE hook command SHALL read `__CFBundleIdentifier` and `TERM_PROGRAM` from its own environment for every agent, and THE normalizers SHALL set `bundleId` and `termProgram` from them, as events.md "Normalized event" defines.
2. WHEN a variable is unset, empty or not well-formed (events.md), THE normalizers SHALL omit that field and still return the event.
3. THE validation function SHALL keep `bundleId` and `termProgram` on events of every agent when they are well-formed, and SHALL return `null` when either one is present and not well-formed.
4. THE normalizers SHALL still never throw, and their output SHALL still pass validation (core Req 5.2, 5.3).
5. THE hook command SHALL stay within its time limits (core Req 13). Reading the two variables adds no file or network access.
6. THE core SHALL keep, per session and outside its event window, the launcher: `bundleId` and `termProgram` taken together from the session's latest event, in event order, that carries either field. Only an event later in event order SHALL replace it.
7. FOR any set of events, a session's launcher SHALL be the same in any arrival order.
8. EACH session in the list SHALL carry its launcher when it has one.
9. Events logged before this spec carry no launcher, so a restored session has none until it sends a new event.

## Requirement 2: Logged-off sessions

**User story:** As a user, I want a session the agent closed to look different from one that only went quiet, so that I know it will not come back by itself.

### Acceptance criteria
1. WHEN a session is `ENDED`, THE displayed-state function SHALL return `ENDED`, whatever the time (replaces core Req 10.9).
2. FOR any session whose events include an `end`, every event of that session with an `at` no later than the `end` SHALL leave its displayed state `ENDED`, in any arrival order (replaces core Req 10.10). A later event of the same session brings it back by the normal rules (core Req 9.12).
3. THE urgency order SHALL be `WAITING_APPROVAL` > `WORKING` > `STALE` > `TURN_DONE` > `IDLE` > `OFFLINE` = `ENDED`. Between sessions of the same rank, the buddy SHALL show the one with the latest last event time, then the smallest session key (core Req 22.3).
4. Core Req 22.2 (no session more urgent than its buddy) and 23.7 (removal leaves remaining states unchanged) SHALL hold with this order. Sharing one rank is what keeps 23.7 true: with two different lowest ranks, removing a 24-hour-old `OFFLINE` session could turn its buddy from `OFFLINE` to `ENDED`.
5. Only Claude reports a session end (events.md), so only Claude sessions can be `ENDED`. Codex sessions still reach only `TURN_DONE`, `IDLE` and `OFFLINE`.

## Requirement 3: `startRelay()`

**User story:** As the builder, I want the relay to be one start function used by the command and the app, so that the app runs the same relay code.

### Acceptance criteria
1. THE relay code SHALL export `startRelay(options)`, which does what `agentbuddy` does on start today: home folder and token, restore, progress reads, listening on `127.0.0.1:<port>`, the live stream and the 30-second tick.
2. `startRelay` SHALL resolve only once the relay listens, with a handle that gives the port and a `stop()` that closes the server and the stream, clears the tick and finishes pending log appends.
3. WHEN the port is in use, `startRelay` SHALL reject with an error the caller can tell apart as "port in use", and leave nothing running.
4. `startRelay` SHALL NOT call `process.exit`, add signal handlers, or write to stdout or stderr. It SHALL pass its messages (for example `log write failed: <code>`) to a callback from the caller.
5. THE `agentbuddy` command SHALL keep its behavior: the same messages, exit 1 when the port is in use, and a clean stop on SIGINT and SIGTERM.
6. A relay started inside the app SHALL meet core Requirements 15–19 and 23.8 unchanged.

## Requirement 4: App start and relay connection

**User story:** As a user, I want to open one app and see my buddies, whether a relay is already running or not.

### Acceptance criteria
1. `npm run app` SHALL build what the app needs and start it from source. Electron SHALL be a development dependency, listed in the README.
2. THE app SHALL run as a single instance. WHEN it is started again, THE running app SHALL show its main window and the new one SHALL quit.
3. WHEN the app starts, it SHALL call `startRelay` with the port from `AGENTBUDDY_PORT`, else 4343 (core port rule).
4. WHEN `startRelay` reports the port in use, THE app SHALL attach: its main process SHALL connect to `http://127.0.0.1:<port>/stream` as a client.
5. WHEN the program on the port does not send a `buddies` message holding a JSON array within 5 seconds of connecting, THE app SHALL show `port <port> is used by another program` and keep retrying.
6. WHEN the connection drops, THE app SHALL show `relay disconnected` and retry every 3 seconds. WHEN a retry finds the port free, THE app SHALL start its own relay and connect to it.
7. WHEN the app quits, it SHALL stop its own relay with `stop()`. An attached relay SHALL keep running.
8. THE settings screen SHALL show whether the app runs its own relay or is attached, and the port.
9. THE app's stream client SHALL send no token. Only the relay code reads the token file (Req 15.6).

## Requirement 5: Main window and menu bar

**User story:** As a user, I want a small window that stays in a corner of my screen and an icon in the menu bar, like a 2000s messenger.

### Acceptance criteria
1. THE app SHALL show one main window, 320 px wide, with a height the user can change (at least 420 px), placed at the top-right corner of the main display's visible area the first time it opens.
2. THE main window SHALL have an always-on-top switch. WHILE it is on, the main window SHALL stay above other apps' windows. The choice SHALL be kept across restarts. Default: on.
3. WHILE the app runs, it SHALL show a menu bar icon. Next to the icon it SHALL show the menu bar count: the number of sessions whose displayed state is `WAITING_APPROVAL`, plus the number of unacknowledged finished turns (Req 10.5). It SHALL show nothing when the count is 0.
4. THE menu bar icon's menu SHALL offer: show the buddy list, show the inbox, quit.
5. WHEN the main window is closed, THE app SHALL hide it and keep running in the menu bar. The relay connection, pings, pop-ups and the inbox SHALL keep working.
6. WHEN the user chooses quit in the menu, or presses Cmd+Q, THE app SHALL quit.
7. THE app SHALL show no Dock icon.
8. THE icons, including the menu bar image, SHALL be original artwork made for this project, drawn in code or in files created for it, and SHALL copy no logo, name or icon of a real messenger (product.md).
9. THE main window SHALL draw its own title bar: the app name, a pin button (always on top, Req 5.2) on the Buddies tab, a minimize button, and a close-to-menu-bar button (Req 5.5). The Inbox and Settings tabs have no pin button (mockups); the Settings tab has the always-on-top checkbox. Dragging the title bar SHALL move the window.
10. WHILE the menu bar count is above 0 and the Buddies tab is shown, THE main window SHALL show an alert strip under the title bar with its two parts, for example `1 needs your OK · 1 done, unread`.
11. ON the Buddies tab, THE main window SHALL show a footer with the relay connection (Req 6.10) and, while always-on-top is on, `on top ✓`. ON the Inbox tab, the footer SHALL show `kept on this computer only` and `click a message to go there`. The Settings tab has no footer; its connections card shows the relay (Req 14.1).
12. WHEN the user clicks the minimize button, THE main window SHALL minimize. It goes into the Dock as a minimized window and comes back from there or from the tray's "Show buddy list" (observed in O4 run C, 2026-11-12).

## Requirement 6: Buddy list screen

**User story:** As a user, I want my agents grouped by project folder, with one row per buddy and one row per conversation, so that I see at a glance who is doing what.

### Acceptance criteria
1. THE screen SHALL group buddies by session folder. A group header SHALL show the folder name (the last path segment) and `(online/total online)`, where a buddy is online unless all its sessions are `OFFLINE` or `ENDED`. WHEN two groups have the same folder name, their headers SHALL also show the parent folder name. The full path SHALL show on hover.
2. EACH group SHALL open and close. Its state SHALL be kept across list updates and app restarts. Default: open for folder groups, closed for the offline group.
3. Buddies that are not online SHALL be listed in a last group, `offline (n)`, under their display name (`Kiro @ demo`). A folder group with no online buddy SHALL not be shown. Folder groups SHALL be ordered by folder name, then full path; buddies in a group by agent (Kiro, Claude Code, Codex), and in the offline group by folder name first; sessions by the core order (urgency, then latest last event, then session key). Within a group, order SHALL NOT depend on state.
4. EACH buddy row SHALL show: a state icon, the agent name, `[n]` when it has two or more visible sessions, the status line of the session that sets the buddy state in parentheses, and an unread dot WHILE any of its sessions has an unacknowledged entry. FOR Kiro it SHALL also show progress: `n/m` with a bar when known, `?/?` when unknown. WHEN a buddy has exactly one visible session, its row SHALL show a × button while the pointer is over the row or the row has keyboard focus; the × hides that session (Req 13). A buddy with two or more visible sessions uses the × of its session rows instead.
5. WHEN a buddy has two or more visible sessions, THE screen SHALL show one session row per visible session under the buddy row: a tree mark, a state icon, the session name (or `started HH:MM:SS` when it has none), the state phrase in parentheses, the time since its last event, and a × button. The row of the session that sets the buddy state SHALL be marked.
6. THE screen SHALL hide `IDLE`, `OFFLINE`, `ENDED` and hidden sessions by default, and SHALL show per buddy one line that counts them and offers to show them (for example `2 logged off · show`). A buddy row SHALL stay when all its sessions are hidden.
7. THE screen SHALL show `STALE` with a `?` icon.
8. FOR Codex buddies, THE screen SHALL show `Codex reports finished turns only` as the buddy row's hover text, and the settings screen SHALL show `Codex · finished turns only`.
9. THE screen SHALL insert all agent text with `textContent`, never as HTML.
10. THE footer SHALL show the relay connection: `relay connected · local only`, `relay disconnected`, the message of Req 4.5, or `relay error: <code>`.
11. Colors, fonts, icons and layout SHALL follow `.kiro/steering/design.md` and the mockups in `docs/mockups/`. UI text is English.
12. THE screen SHALL replace the text-only table. THE relay SHALL keep serving it at `http://127.0.0.1:<port>/`, where it SHALL show and update the list. Pings, pop-ups, jump, ×, acknowledgement, the inbox, the title bar buttons and always-on-top are app-only and SHALL NOT appear there.
13. EVERY control SHALL be a real `<button>`, or a `<label>` with an `<input>`. Icon-only buttons SHALL have an `aria-label`. State icons SHALL be hidden from screen readers, with the state name given as text instead. Text SHALL have a contrast of at least 4.5:1 against its background.

## Requirement 7: Status line wording

**User story:** As a user, I want each status to read like a messenger status message, with a short hint of what the agent is on.

### Acceptance criteria
1. THE core SHALL provide a pure function that takes a displayed state, whether the session is in a Kiro spec task, an optional status text and the hide-text setting, and returns the status line as a phrase and an optional excerpt, so the screen can color the phrase.
2. EACH displayed state SHALL have this phrase (design.md):

   | State | Phrase |
   |---|---|
   | `WAITING_APPROVAL` | `need your OK T_T` |
   | `WORKING` | `♪ working…`; a Kiro session in a spec task: `♪ studying hard` |
   | `STALE` | `? no news for a while` |
   | `TURN_DONE` | `★ done~ your turn!` |
   | `IDLE` | `brb~ zZ` |
   | `OFFLINE` | `offline` |
   | `ENDED` | `logged off` |

   A Kiro session is in a spec task WHEN its status text comes from a task event (`task_start` or `task_done`), so the core SHALL pass that fact on with each session.
3. WHEN there is status text and hide-text is off, the excerpt SHALL be the status text cut to 40 code points with the core truncation function, shown after ` · `. Otherwise there is no excerpt.
4. WHILE hide-text is on, THE app SHALL show no agent text anywhere: status lines are phrases only, session names become `started HH:MM:SS`, and pop-ups, macOS notifications and the inbox screen show no session name or status text.
5. Kiro progress stays a separate part of the buddy row (Req 6.4), not part of the status line.

## Requirement 8: Pings

**User story:** As a user, I want a "ding" and a message window the moment an agent finishes or needs my OK, and no repeats for something I already heard.

### Acceptance criteria
1. THE core SHALL provide a pure function that takes the previous list (or none) and the next list, and returns one ping for each session whose displayed state in the next list is an attention state and whose displayed state in the previous list was different, or which was not in the previous list.
2. WHEN there is no previous list, the function SHALL return no pings. THE app SHALL pass no previous list for each baseline list, so states restored when a relay restarts, and states reached while the app was disconnected, never ping.
3. A session whose displayed state is the same in both lists SHALL NOT ping. A session that leaves an attention state and enters it again (for example `TURN_DONE` → `WORKING` → `TURN_DONE`) SHALL ping again.
4. FOR each ping, THE app SHALL add an unacknowledged inbox entry whatever the settings are, play the ding unless sound is off, show a pop-up (Req 9) unless pop-ups are off, and show a macOS notification only when macOS notifications are on (default off).
5. WHEN one list gives several pings, THE app SHALL play the ding once, and show one pop-up (and, when on, one macOS notification) per session.
6. THE ding SHALL be synthesized with the Web Audio API. THE app SHALL ship no recorded sound files.
7. THE ding SHALL play without a user gesture, also while the main window is hidden (C12).
8. A macOS notification SHALL have the buddy's display name as title and, as body, the state phrase and, unless hide-text is on, the session name. It SHALL play no system sound; the ding is the sound.
9. WHEN the user clicks a macOS notification, THE app SHALL jump to that session (Req 12).
10. Kiro never reports approval waits and Codex reports finished turns only (events.md), so Kiro and Codex sessions ping only on `TURN_DONE`. Claude approval pings depend on `Notification` events, which have not arrived since connecting (events.md).

## Requirement 9: Pop-up window

**User story:** As a user, I want a small message window to slide up in the corner when a buddy pings, without pulling me out of what I am typing.

### Acceptance criteria
1. FOR each ping, unless pop-ups are off, THE app SHALL show a 300 px wide pop-up card that rises from the bottom-right corner of the main display's visible area. It SHALL rise only inside its own window, and not move at all WHEN the system asks for reduced motion.
2. Pop-ups SHALL show whether the main window is shown or hidden, and SHALL stay above other apps' windows.
3. Showing, moving or closing a pop-up SHALL NOT activate the app or take keyboard focus. The frontmost app and its focused window SHALL stay as they were.
4. A pop-up SHALL close by itself a few seconds after it appears. The time is set in the design.
5. A pop-up SHALL have a × button, a `Later` button and a `Go there →` button. × SHALL close it and acknowledge its session without jumping. `Later` SHALL close it only, so its entry stays unacknowledged. WHEN the user clicks `Go there →` or anywhere else on the card, THE app SHALL close it and jump to its session (Req 12), which acknowledges the session (Req 10.2).
6. WHEN a pop-up opens while others are shown, it SHALL appear above them with a 10 px gap, so pop-ups stack upward. WHEN the next one would not fit in the visible area, THE app SHALL close the oldest first.
7. A pop-up SHALL show a title (`Ding! ♪ needs your OK` or `Ding! ♪ new message`), the time of the ping, the buddy's display name, the state phrase and one detail line, all inserted with `textContent`. The detail line SHALL be the excerpt for `TURN_DONE` when there is one, else `session · <session name>`. WHILE hide-text is on, there SHALL be no detail line.
8. WHEN a session is acknowledged in any other way, its open pop-ups SHALL close.
9. The pop-up's look SHALL follow the builder's mockups, with original artwork (Req 5.8). Req 15 applies to pop-ups as to the main window.

## Requirement 10: Acknowledging pings

**User story:** As a user, I want the app to know which finished turns I have already looked at, so that the menu bar count shows only what still needs me.

### Acceptance criteria
1. EACH inbox entry SHALL start unacknowledged.
2. WHEN the user clicks a session row, goes there from a pop-up, closes a pop-up with its ×, jumps to a session by any means (including a macOS notification or an inbox entry), or hides a session with ×, THE app SHALL acknowledge every unacknowledged entry of that session. A pop-up's `Later` acknowledges nothing. WHEN the user clicks `Mark all read` in the inbox, THE app SHALL acknowledge every unacknowledged entry of today, without jumping.
3. WHEN the user clicks a buddy row, THE app SHALL acknowledge every unacknowledged entry of each of that buddy's sessions, and jump as in Req 12.1.
4. A new ping for a session SHALL add a new unacknowledged entry, so the next finished turn is unacknowledged again.
5. A session SHALL count as an unacknowledged finished turn WHILE its displayed state is `TURN_DONE` and its latest inbox entry of today has state `TURN_DONE` and is unacknowledged. A session that is `TURN_DONE` in a baseline list and has no such entry SHALL NOT count.
6. `WAITING_APPROVAL` sessions SHALL count in the menu bar count whether or not they are acknowledged, because the agent still waits.
7. A click SHALL acknowledge even when the jump that follows finds no launcher or fails.
8. Acknowledgements SHALL be kept across restarts in the inbox file (Req 11.2).
9. Acknowledging SHALL send nothing to the relay or to any agent.

## Requirement 11: Inbox

**User story:** As a user, I want a list of today's pings that shows which ones I have not looked at yet.

### Acceptance criteria
1. EACH inbox entry SHALL hold: the time the app found the ping, the buddy's display name, the session key, the session name (or its start time when it has none), the state, and whether it is acknowledged.
2. THE app SHALL keep entries and acknowledgements in `~/.agentbuddy/inbox-YYYY-MM-DD.jsonl`, named by the local date of the ping, as appended JSON lines, with file mode 600 in the folder of mode 700.
3. THE inbox screen SHALL show `Today · n unread` (n = unacknowledged entries of today) with a `Mark all read` button, then today's entries, newest first, each with a state icon, the buddy's display name, `need your OK · <session name>` or `turn done · <session name>`, time `HH:MM`, and a mark on unacknowledged entries. The `Inbox` tab SHALL show n as a badge while n is above 0.
4. WHEN the app starts, it SHALL load today's file and skip lines that are not valid. A missing or unreadable file SHALL give an empty inbox.
5. WHEN an append fails, THE app SHALL keep the record in memory, and pings SHALL keep working.
6. WHEN the user clicks an entry, THE app SHALL jump to its session (Req 12), which acknowledges it.
7. Inbox files SHALL stay on this machine. Old inbox files are not deleted in this spec.

## Requirement 12: Jump to the agent's app

**User story:** As a user, I want a click on a buddy, a session or a ping to bring forward the app that agent runs in.

### Acceptance criteria
1. WHEN the user clicks a session row, a pop-up, a macOS notification or an inbox entry, THE app SHALL jump to that session. WHEN the user clicks a buddy row, it SHALL jump to the session whose status line the buddy row shows.
2. A window SHALL send only a key (session key, or buddy key for a buddy row). THE main process SHALL look up the session and its launcher in its own copy of the latest list.
3. THE main process SHALL check `bundleId` again against the events.md form before using it, and SHALL run nothing when the check fails.
4. THE main process SHALL run programs only with `execFile`, never through a shell, with an absolute program path and an argument array. The bundle ID SHALL never be part of a script or shell text. For `lsappinfo` it is the value of the single argument `bundleid=<id>`.
5. Before bringing an app forward, THE main process SHALL run `/usr/bin/lsappinfo find bundleid=<id>`. WHEN it prints nothing, the app is not running: THE app SHALL show `<bundle ID> is not running` and SHALL run nothing else. (O2: this check does not start the app; `open -b` does.)
6. THE main process SHALL bring the app forward with `/usr/bin/open -b <id>` (O2: worked for Kiro, VS Code, Claude, ChatGPT/Codex and Terminal; without a folder it brings forward the app's last-used window). It SHALL NOT use `osascript`.
7. THE main process SHALL add the session's folder as an argument (`/usr/bin/open -b <id> <folder>`) only WHEN all of these hold: the bundle ID is `dev.kiro.desktop`; the session's displayed state is neither `OFFLINE` nor `ENDED`; the folder is that session's folder in the relay's list, looked up by the main process; it is an absolute path; and it is an existing directory at the time of the click. A path from a window or from any other field SHALL never be used. Every other jump SHALL pass no folder. (O3: a folder that is not already open as a window opens a new window; Q1 decided (b).)
8. THE app SHALL never select a terminal tab in this spec.
9. WHEN the session has no launcher, THE app SHALL show `can't tell which app this session is in` and run nothing. WHEN the session is no longer in the list, it SHALL show `this session is gone`.
10. A jump SHALL never send anything to the agent's app beyond bringing it (or one of its windows) forward: no keystrokes, no text, no approval.
11. THE main process SHALL stop a jump command after 3 seconds. Any failure, including an unknown bundle ID (`open -b` exits 1), SHALL show a notice and SHALL NOT crash the app.
12. `termProgram` names a terminal program, not an app bundle, so it SHALL NOT be used to choose the app in this spec. It is kept for later window or tab selection.

## Requirement 13: Hiding a session

**User story:** As a user, I want to close a conversation row I am done with, and have it come back when the agent does something new.

### Acceptance criteria
1. WHEN the user clicks the × of a session row, or the × of a buddy row with exactly one visible session (Req 6.4), THE app SHALL hide that session until it has an event whose `at` is later than the session's last event time at the moment of the click.
2. Hiding a session SHALL acknowledge it (Req 10.2).
3. Hidden sessions SHALL appear under the buddy's show-hidden control (Req 6.6).
4. Hiding SHALL change only which rows show. The buddy's state and status line, and pings, SHALL still count every session. A hidden `WAITING_APPROVAL` session SHALL still count in the menu bar count (Req 10.6); a hidden `TURN_DONE` session drops out of it because hiding acknowledges it.
5. THE app SHALL keep hidden sessions across restarts in its settings file, and SHALL drop an entry whose hide time is more than 24 hours old.
6. Hiding SHALL send nothing to the relay or to any agent.

## Requirement 14: Settings

**User story:** As a user, I want to turn sound, pop-ups, macOS notifications, agent text and always-on-top on or off, and have the app remember it.

### Acceptance criteria
1. THE settings screen SHALL offer: hide message text (default off), sound (default on), pop-ups (default on), macOS notifications (default off), always on top (default on). It SHALL also show a connections card: the relay address with whether the app started the relay or attached to it (Req 4.8), and one line per agent: `hooks on` WHEN the agent has a session in the list (an event in the last 24 hours), else `no events in 24 h`. Codex shows `finished turns only` in place of `hooks on`.
2. A change SHALL apply at once and SHALL be saved to `~/.agentbuddy/app-settings.json` (mode 600), together with group open/closed states and hidden sessions.
3. WHEN that file is missing, unreadable or invalid, THE app SHALL use the defaults and keep running. It SHALL take only known keys with values of the right type.

## Requirement 15: Electron security

**User story:** As a user, I want the app to keep agent text and my machine safe even if a payload or a page is hostile.

### Acceptance criteria
1. EVERY window, the main window and each pop-up, SHALL have `contextIsolation` on, `nodeIntegration` off and `sandbox` on.
2. THE main window's preload SHALL expose through `contextBridge` only: receive lists, connection status, inbox records and ding requests from the main process; report a click on a buddy row, session row or inbox entry (by key); mark all read; hide (session key); read and change settings; read today's inbox; minimize or close the main window. A pop-up's preload SHALL expose only: receive its content, report `go`, `close` or `later`. No preload SHALL expose `ipcRenderer`, Node APIs or a general message channel.
3. THE main process SHALL accept messages only from its own windows showing the app's own UI files, and SHALL check the type, length and allowed values of every argument.
4. EVERY window SHALL load only the app's bundled UI files. THE app SHALL block navigation away from them, refuse to open new windows, cancel every other request from them, and deny every permission request from them.
5. THE UI SHALL set a Content Security Policy that allows only its own files.
6. No window SHALL ever receive the token.

## Requirement 16: Agents and privacy

**User story:** As a developer running agents, I want the app to keep the two core promises: it never gets in an agent's way, and nothing leaves my machine.

### Acceptance criteria
1. THE app SHALL never answer, approve or send input to an agent, and SHALL never change agent settings or hooks.
2. THE hook command SHALL keep its limits (core Req 13) whether the app is running, attached or quit.
3. THE app's only network connection SHALL be to `127.0.0.1:<port>`. It SHALL use no Electron feature that reaches the network: no auto-update, no crash report upload, no spell-check dictionary download, no remote content.
4. Inbox, settings and logs SHALL stay in `~/.agentbuddy/`. macOS notifications, when turned on, go only to Notification Center on this machine.
5. THE fonts (Nanum Gothic and Silkscreen, both OFL) SHALL ship inside the app with their license files. No window SHALL fetch a font or any other file from the internet.

## Requirement 17: Tests and checks

### Acceptance criteria
1. Unit tests SHALL cover:
   - `bundleId` and `termProgram` forms: the observed values in events.md are accepted; values with spaces, quotes, `;`, `=`, `$(`, a leading `-` or `.`, a single label, or too many characters are rejected;
   - the hook, spawned with those variables set, sends both fields; with malformed values, it sends the event without them;
   - status lines for every state, with and without status text, with hide-text on and off, and `♪ studying hard` for a Kiro session in a spec task;
   - the buddy list model: online counts, the offline group, same-name folders, `[n]`, session rows only for two or more visible sessions, the hidden-sessions line;
   - pop-up × acknowledges without jumping, `Later` acknowledges nothing; the buddy-row × hides and acknowledges the single visible session; `Mark all read` acknowledges every entry of today;
   - every text color pair in the stylesheet tokens has a contrast of at least 4.5:1, and the built UI holds the font files and their licenses and no `http:` or `https:` URL;
   - pings: baseline list, restored list after a reconnect, the same list twice, `TURN_DONE` → `WORKING` → `TURN_DONE`, a new Codex session first seen in `TURN_DONE`, several pings in one list;
   - acknowledgement and the menu bar count: each way of acknowledging (session row, buddy row, pop-up, jump, ×), a new finished turn counting again, a baseline `TURN_DONE` session not counting, a hidden `WAITING_APPROVAL` session still counting, acknowledgements back after a restart;
   - pop-up placement: stacking upward, and the oldest closing first when the next does not fit;
   - inbox file mode 600, bad lines skipped; settings file validation;
   - jump commands are built as argument arrays, only for valid bundle IDs; the running check comes first; a folder argument only under Req 12.7;
   - `startRelay` start, `stop()`, and port in use;
   - the window options (security flags of Req 15.1) from a pure function, for the main window and pop-ups.
2. Property tests SHALL cover:
   - normalize (core P1) with the two new fields: present only when well-formed;
   - a session's launcher is the same in any arrival order;
   - core P11 and P12 with the urgency order of Req 2.3, and P15 with `ENDED` as the displayed state;
   - pings: no previous list gives none; the same list twice gives none; every ping is an entry into an attention state; over any sequence of lists, a session's ping count equals the number of times it enters an attention state after the baseline;
   - the menu bar count, for any sequence of lists and acknowledgements, equals the `WAITING_APPROVAL` sessions plus the unacknowledged finished turns, and is never negative;
   - status lines: with hide-text on, the line equals the phrase; otherwise it is at most the phrase plus 43 code points.
3. Checks with the builder, on this machine:
   - `npm run app` with no relay running starts the app's own relay, and this repository's Kiro session shows in the `agentbuddy` group;
   - with `agentbuddy` already running, the app attaches; quitting the app leaves that relay running;
   - a finished Kiro turn gives one ding and one pop-up, while typing in another app goes on without interruption; restarting the app gives no ding for restored states;
   - three quick pings stack three pop-ups upward, and each closes by itself;
   - the menu bar count goes up on a finished turn and down when its pop-up (card or ×), session row or inbox entry is clicked, or the session is hidden from its session row or buddy row; `Later` leaves it up;
   - with the main window closed, pings and pop-ups still come;
   - clicking a Kiro session brings Kiro forward, and clicking a Claude app session brings Claude forward;
   - with hide-text on, no prompt or reply text appears anywhere, including pop-ups, notifications and the inbox.
4. Fixtures and tests SHALL contain no real home paths, user names, session IDs or tokens. Bundle IDs of public apps are allowed.
5. THE README SHALL describe `npm run app`, own and attached relays, the new files in `~/.agentbuddy/`, Electron and the two fonts (with their OFL licenses) in the third-party list, and the known limits.

---

## Unverified behavior

| Behavior | Status | Handling until observed |
|---|---|---|
| `__CFBundleIdentifier` and `TERM_PROGRAM` in Kiro IDE task-run hooks | UNVERIFIED (chat hooks observed: `dev.kiro.desktop`, `TERM_PROGRAM` unset) | without a launcher, a click shows the notice of Req 12.9 |
| The same in Kiro CLI hooks | UNVERIFIED | same |
| The same for Codex CLI and Codex in the ChatGPT app | UNVERIFIED; no `notify` call observed yet | same |
| `TERM_PROGRAM` in Claude app hooks | not recorded; no probe hook (builder's decision) | seen once the hook sends the fields |
| Moving to another Space, leaving full screen, restoring a minimized window on `open -b` | not measured (O2 sees only on-screen windows of the current Space) | `open -b` as observed |
| Kiro window by folder right after a new Kiro window opened | misfired in O3 (see results) | accepted with Q1 (b); a misfire leaves the wrong window or app in front and changes nothing else |
| Opening a given conversation in the Claude app or the Codex app | UNVERIFIED; no documented way checked | app only |
| Terminal tab selection | not attempted | app only |
| A pop-up shown without activating the app or taking focus | observed in O4 run A: frontmost app unchanged, pop-up not focused | as designed |
| Clicks reaching a pop-up that never takes focus | observed in O4 run B: the click arrived, the app was not activated | as designed |
| `open -b` after a pop-up click, with another app in front; pop-ups over full-screen apps | UNVERIFIED (in run B Kiro was already in front; full screen not tried) | O4 |
| macOS notifications from Electron run from source | observed in O4 run A: `show()` failed with `UNErrorDomain` error 1 (not allowed) | optional and off by default; a failure shows a notice (design) |
| Ding without a gesture while the main window is hidden | observed in O4 run A: the context was `running` with no gesture in a `show: false` window | as designed |
| Where a minimized main window goes when the app has no Dock icon, and how it comes back | observed in O4 run C: into the Dock as a minimized window; it came back from there | native minimize, as designed |
| Height resize and title bar drag of the frameless main window; its corners; whether a transparent window still resizes | UNVERIFIED (not tried in O4) | opaque window with 10 px corners all round; checked in task 10.7 |
| The tray icon and its title being visible; a Dock icon flash at start | UNVERIFIED (not watched in O4) | checked in task 8.5 |
| Claude `Notification` (`permission_prompt`, `idle_prompt`) since connecting | not observed since connecting (events.md) | handled by the core rules; no extra handling |

## Observations

### O1. Launcher values in real hook processes (2026-11-12)
All values are recorded in events.md.
- Kiro IDE chat hooks (Kiro IDE 1.4.154): `__CFBundleIdentifier=dev.kiro.desktop`, `TERM_PROGRAM` unset, on one `Stop` and one `UserPromptSubmit` call. The Kiro agent's own shell has `TERM_PROGRAM=kiro`, so a hook process does not get every variable of that shell. The two temporary hooks wrote only the time and the two values; they and their output file were removed after reading.
- Builder's own shell check: VS Code terminal `com.microsoft.VSCode` / `vscode`; Terminal `com.apple.Terminal` / `Apple_Terminal`.
- Inside a private `tmux` server started from the Kiro agent's shell (tmux 3.5a): `dev.kiro.desktop` (inherited from the shell that started the server) / `tmux`.
- Claude: no temporary hook (builder's decision). Its values are seen once the hook sends the fields.
- Kiro task runs and Codex: seen once the hook sends the fields, from the daily log.

### O2. Bringing each app forward (2026-11-12, 05:37 UTC, macOS 26.6.2)
Method: run the command, wait 1.5 s, then read the frontmost app (`NSWorkspace`) and the on-screen windows from front to back (`CGWindowListCopyWindowInfo`), both through JXA without Apple Events and without window titles.

| App | Bundle ID | Version | `open -b <id>` | Notes |
|---|---|---|---|---|
| Kiro | `dev.kiro.desktop` | 1.4.154 | came forward, exit 0, 0.11 s | without a folder, the last-used window came forward (2 of 2) |
| VS Code | `com.microsoft.VSCode` | 1.98.2 | came forward, exit 0, 0.15 s | without a folder, the last-used window came forward (1 of 1) |
| Claude | `com.anthropic.claudefordesktop` | 5.1231.2 | came forward, exit 0, 0.16 s | |
| ChatGPT (Codex) | `com.openai.codex` | 26.1103.60933 | came forward, exit 0, 0.35 s | its window was not on screen before and became visible; the low window number shows an existing window, not a new one |
| Terminal | `com.apple.Terminal` | 2.15 | came forward, exit 0, 0.09 s | same as ChatGPT |
| iTerm2 | `com.googlecode.iterm2` | not running | not tested | |

- No permission prompt appeared. `osascript` was not tried, because `open -b` worked for every app (builder: compare only where `open -b` fails).
- An app that is not running: `open -b com.apple.calculator` started Calculator (a stand-in, so that no work app had to be quit; it was closed again). `lsappinfo find bundleid=<id>` printed nothing for iTerm2 and Calculator while they were not running, and started neither.
- An unknown bundle ID: `open -b` exits 1 and writes a message to stderr.
- Once, Kiro came to the front by itself about 4 s after an unrelated step. The cause is unknown.

### O3. Window by folder (2026-11-12)
Empty folders under `/tmp` were used, so no project was touched.

| App | Folder passed | Result |
|---|---|---|
| Kiro | folder already open in a window | that window came forward: 1 of 1 with one window; 3 of 3 alternating between two windows |
| Kiro | folder not open | a new window opened |
| Kiro | folder open, within about 10 s after a new Kiro window opened | 1 of 3 right: twice Kiro did not come forward, once the other window came forward |
| VS Code | folder not open | a new window opened |
| VS Code | folder already open in a window | that window came forward (1 of 1) |
| VS Code | subfolder of a folder open in a window | a new window opened |

- The rule planned for O3 (use a folder only if it never opens a new window) holds for no app, because the app cannot know beforehand whether the session folder is open as a window. The builder decided Q1 (b) (see Decisions).
- A third repeat run lost its output. The command kept switching between Claude and Kiro for about 40 s after the tool had returned, and it opened the Kiro window for the empty folder again after it had been closed. No more focus tests were run after that.

### O4. Electron run from source
The first task after design. With Electron installed as a development dependency, a minimal main window, pop-up and tray check:
- a pop-up shown without activating the app: the frontmost app keeps keyboard focus while typing goes on;
- a click on the pop-up arrives although it never took focus, and `open -b` right after it brings the target app forward;
- pop-ups over a full-screen app and on another Space;
- a synthesized tone plays with no gesture while the main window is hidden;
- a macOS notification shows (and under which name), a permission prompt appears or not, a click on it arrives while the main window is hidden;
- the menu bar title shows a number;
- the frameless main window: it resizes in height, the title bar drags it, its corners, and where it goes when minimized with no Dock icon and how it comes back;
- the bundled fonts load from `app://ui/` with the request filter on.

Results so far (Electron 45.3.1, macOS 26.6.2):
- Run A, 2026-11-12 08:10 UTC: `app.dock.isVisible()` was `false` right after `app.dock.hide()` at `ready`. The `<all_urls>` request filter also matched the custom `app://` scheme and cancelled the check page itself (`ERR_BLOCKED_BY_CLIENT`), so the run ended after 3 s and the tray, pop-up, tone and notification checks did not run. The design now lets `app://ui/` through by prefix. Chromium printed `task_policy_set … invalid argument` twice at exit; nothing else followed from it.
- Run A again, 2026-11-12 (after the filter fix): in a window created with `show: false`, a font served from `app://` loaded (`document.fonts.check` true) under `default-src 'self'`; a `fetch` to `http://127.0.0.1:9/` failed, blocked by the page's CSP before it reached the request filter; an `AudioContext` created with no user gesture was `running` at once and its clock moved, so the tone played. `document.hidden` was `false` in that hidden window. The tray was created. Then the app quit by itself 1 s in, when the hidden window was destroyed: Electron quits when its last window closes unless something listens to `window-all-closed`. The design now registers that listener. The pop-up, the tray title and the notification did not run yet.
- Run A, third try, 2026-11-12 (with the listener): probe results as above. The `panel` pop-up shown with `showInactive()` for 6 s left the frontmost app as it was (`dev.kiro.desktop` before, 0.8 s after and at the end), was not focused, and no window of the app was focused. `Notification.isSupported()` was `true`, but `show()` failed with `UNErrorDomain` error 1 (notifications not allowed), so Electron run from source could not post a macOS notification. The tray was created; `tray.getBounds()` returned `{ x: 0, y: 982, width: 46, height: 0 }`, so whether it was visible needs the builder's eyes. The run ended normally after 12 s. The builder did not watch this run, so what was seen and heard is not recorded.
- Run B, 2026-11-12: the pop-up was shown inactive at 0.8 s with Kiro in front; a click on it, made by the builder, arrived at 1.2 s (`acceptFirstMouse`), and after the click Kiro was still in front and the pop-up was not focused, so a click does not activate the app. `open -b dev.kiro.desktop` then exited without error, but Kiro was already in front, so bringing it forward from behind another app is not shown yet. The notification failed again with `UNErrorDomain` error 1. The run ended normally after 44 s.
- Run C, 2026-11-12: the builder minimized the transparent frameless window with its `_` button. It went into the Dock as a minimized window although the app has no Dock icon, and came back from there 1.3 s later (`minimize`, then `restore`; the tray's "Show windows" was not used). Height resize, title bar drag, the corners, the opaque window's minimize and the tray icon were not tried; no `resize` event was logged. The run ended normally after 60 s.
- Not checked in O4, moved to the first runs of the real app: the tray icon and its title being visible, a Dock icon flash at start (task 8.5); `open -b` bringing Kiro forward from behind another app after a pop-up click (task 8.5); the ding being heard (task 10.5); height resize, title bar drag, the corners, and whether a transparent window resizes (task 10.7); pop-ups over a full-screen app (task 11).

## Revisions from the design steering (2026-11-12)

`.kiro/steering/design.md` and `docs/mockups/` changed these criteria. Look and wording follow design.md. The builder approved the behavior changes on 2026-11-12, with two corrections that are already in the rows below: a × on the row of a buddy with one visible session, and a pop-up × that acknowledges while `Later` does not.

| Criterion | Before | Now | Kind |
|---|---|---|---|
| 5.1 | window size from the design | 320 px wide, height changeable, at least 420 px | look |
| 5.9–5.12 | none | own title bar with pin, minimize and close-to-menu-bar; alert strip on the Buddies tab; footer per tab; minimize | look, plus minimize (behavior, O4) |
| 6.1–6.3 | groups by folder only; order never depends on state | `(online/total online)` in headers; buddies with no online session move to a last `offline (n)` group | behavior |
| 6.4 | `task n/m`, `progress unknown` | `n/m`, `?/?`; `[n]`; unread dot | look |
| 6.4, 6.5 | a session row for every visible session, with the full status line | session rows only for buddies with two or more visible sessions; phrase only, plus time since the last event; a buddy with one visible session gets a × on its row (builder, 2026-11-12) | behavior |
| 6.6 | a show control with a count | one line such as `2 logged off · show` | look |
| 6.8 | Codex note on the screen | hover text on the Codex row and a line in settings | look |
| 6.10 | a notice, hidden when a list arrives | the footer always shows the connection | look |
| 6.13 | none | buttons, labels, `aria-label`, contrast 4.5:1 | look |
| 7.1–7.3 | `working… ♪`, `done~ your turn!`, `brb~`; one string | `♪ working…` or `♪ studying hard` (Kiro spec task), `★ done~ your turn!`, `brb~ zZ`; phrase and excerpt apart | wording, plus the spec-task fact from the core |
| 9.1, 9.5–9.7 | small window; any click jumps | 300 px card; × closes and acknowledges, `Later` only closes (builder, 2026-11-12); title, time, detail line | behavior |
| 10.2, 11.3 | none | `Mark all read`; `Today · n unread`; tab badge; `need your OK` / `turn done` in rows | behavior (`Mark all read`) |
| 14.1 | five switches | plus a connections card (`hooks on`, `no events in 24 h`, `finished turns only`) | look |
| 16.5 | none | fonts and their licenses inside the app; no font fetch | look |

Not taken from design.md: the optional "my status row" (`me` and an editable status message). It is not in these requirements; it can be added as an optional last task.

## Decisions (confirmed by the builder, 2026-11-12)

| # | Decision |
|---|---|
| A1 | The ping's message window is a retro pop-up window of our own: a small window that rises from the bottom-right corner, shows even when the main window is hidden, never takes focus, closes after a few seconds, jumps on click, and stacks upward. macOS notifications are an optional extra, off by default. (Changed from the first draft.) |
| A2 | A ping happens when a session's displayed state changes into an attention state between two lists. A new turn pings again; a repeated list or a second `stop` while still `TURN_DONE` does not. The baseline list never pings. |
| A3 | Every ping goes into the inbox, whatever the settings. |
| A4 | The menu bar count is `WAITING_APPROVAL` sessions plus unacknowledged finished turns. Clicking the session or its buddy, clicking its pop-up, or jumping to it acknowledges it; the next finished turn is unacknowledged again. The inbox marks unacknowledged entries. (Changed from the first draft.) |
| A5 | × hides only the row; buddy state and pings still count the hidden session. Hiding with × acknowledges the session. (Addition by the builder.) |
| A6 | `OFFLINE` and `ENDED` share the lowest rank. |
| A7 | Hide-text hides all agent text, including session names, pop-ups, notifications and the inbox screen. |
| A8 | The phrases of Req 7.2; status text cut to 40 code points. |
| A9 | Always-on-top on by default; no Dock icon. |
| A10 | A jump never starts an app that is not running. |
| A11 | When an attached relay goes away, the app starts its own relay on the next retry. |
| A12 | Flat fields `bundleId` and `termProgram`. |
| Q1 | (b): a folder argument only for bundle ID `dev.kiro.desktop` and sessions that are not `OFFLINE` or `ENDED`, with the relay's session folder for that session, an absolute path to an existing directory; never a path from a window or an event field (Req 12.7). A Kiro IDE session's folder is the workspace of the window the agent runs in, so that window is very likely open while the session is active. VS Code and terminals never get a folder, because a Claude or Codex session folder is often a subfolder, and VS Code opened a new window for a subfolder (O3). |
| — | A buddy-row click acknowledges every session of that buddy (Req 10.3). |
| — | No temporary Claude probe hook; terminal values come from the builder's own shell check. |
| — | O4 is the first task after design. |
