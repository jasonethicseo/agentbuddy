# Implementation Plan: Messenger App

How to work through this list:
- One top-level task at a time. When it is done, run `npm test` and `npm run typecheck`, make one commit for that task, then stop and report to the builder in Korean: what changed, test results, anything left open.
- Stage files by name. Never commit real home paths, user names, session IDs or tokens.
- Ask the builder before anything that changes the machine outside this repository, and before every download (Electron, the font files).
- Never change what the user sees without warning (tech.md). A check that focuses, opens or launches a window or an app is announced first with what will happen and for how long, runs once, and stops before the tool call returns. Every background process started for a check is stopped, and confirmed stopped, before reporting. `npm test` never opens a window or runs `open` or `lsappinfo`.
- The builder's relay (`agentbuddy`) stays running while working; the app attaches to it until the relay is restarted from a new build.
- `npm run build` also rebuilds the linked `agentbuddy-hook`, so agents use the new hook at once. A hook call during the rebuild can only fail into `|| true` and exit 0.
- Optional tasks are marked `- [ ]*`.

- [x] 1. O4: Electron run from source
  - [x] 1.1 With the builder's OK, add `electron@^45` as a development dependency (it downloads the Electron binary into a cache outside this repository). First commit of this task also holds this spec, the steering changes (`events.md`, `tech.md`, `design.md`) and `docs/mockups/`.
  - [x] 1.2 Write a throwaway check app in `scripts/o4/` (not part of the product): a frameless 320×620 main window that resizes in height, a transparent variant, a `type: 'panel'` pop-up shown with `showInactive()`, a tray icon with a title, a synthesized tone, a notification, an `app://` page with one bundled test font, and the `<all_urls>` request filter. It quits itself after a fixed time, at most 60 seconds per run.
  - [x] 1.3 Run each check with the builder, one at a time, each announced first (what appears, for how long): pop-up while the builder types in another app (focus kept?); a click on the pop-up (does it arrive? does `open -b dev.kiro.desktop` right after it bring Kiro forward?); pop-up over a full-screen app; tone while the window is hidden; notification (shown name, permission prompt, click while hidden); tray title; title bar drag and height resize; transparent window resize; minimize with no Dock icon (where does it go, how does it come back); the font and the page load with the filter on. Confirm the check process is gone after each run.
  - [x] 1.4 Record the results with date and versions in requirements O4 and the unverified table. Where a result differs from the design (for example `focusable`, the window corners, minimize), propose the change to the builder before task 8. Delete `scripts/o4/` once its results are recorded.
  - _Requirements: 5.9, 5.12, 8.7, 9.2, 9.3, 9.5, 16.5_
  - Result (2026-11-12): the pop-up takes no focus and its click arrives without activating the app; a tone plays with no gesture in a hidden window; a font loads from `app://` under the CSP; minimize sends the window into the Dock and it comes back. Two design changes: the request filter lets `app://ui/` through by prefix, and the app listens to `window-all-closed`. macOS notifications fail when Electron runs from source (`UNErrorDomain` error 1). Not checked here, moved to 8.5, 10.5, 10.7 and 11.

- [x] 2. Launcher fields on events
  - [x] 2.1 Create `src/core/launcher.ts` (`isBundleId`, `isTermProgram`, `launcherFields`); add `bundleId` and `termProgram` to `BuddyEvent` and `validateEvent`; extend `normalize`'s `env`; read `__CFBundleIdentifier` and `TERM_PROGRAM` in `src/hook/cli.ts`
    - _Requirements: 1.1–1.5_
  - [x] 2.2 Add `latest` and `hasLauncher` to `history.ts`; keep `launcher` in `SessionRecord`; copy `bundleId` and `termProgram` into `SessionView`
    - _Requirements: 1.6–1.9_
  - [x] 2.3 Unit tests: launcher forms (observed values from events.md accepted; spaces, quotes, `;`, `=`, `$(`, leading `-` or `.`, one label, too long rejected); the hook spawned with the variables set and with malformed values. Property tests: P1 updated, P16
    - _Requirements: 17.1, 17.2_
  - [x] 2.4 After the build, the builder restarts the relay so it keeps the new fields. From then on the daily log collects launcher values from normal use (Kiro task runs, Claude app and CLI, Codex), read in task 11.
  - Result (2026-11-12): the relay started at 14:08 had been running detached with no terminal, so it was restarted for the builder: stopped with SIGTERM, then started again from the new build in its own session (no terminal; output in `~/.agentbuddy/relay.log`, mode 600). It restored 146 events.

- [x] 3. Logged-off sessions, spec-task flag and status wording
  - [x] 3.1 `displayState` returns `ENDED`; `RANK` with `OFFLINE` = `ENDED`; buddy state from the first sorted session; update P11, P12, P15
    - _Requirements: 2.1–2.5_
  - [x] 3.2 `textFromTask` in `foldSession`; `SessionView.task` for Kiro sessions
    - _Requirements: 7.2_
  - [x] 3.3 `PHRASES`, `SPEC_TASK_PHRASE`, `statusParts`, `statusLine` in `text.ts`; unit tests per state (with and without text, hide-text on and off, `♪ studying hard`); P21
    - _Requirements: 7.1–7.4_
  - [x] 3.4 Keep the old text-only list working until task 10: add `ENDED` to its hidden-by-default states and update `ui-list.test.ts`
  - [x] 3.5 Steering: events.md "State rules" and "Buddies and sessions" (`ENDED` shown as `logged off`, urgency `OFFLINE` = `ENDED`, hidden by default) and the matching tech.md property line
    - _Requirements: C5, C6, C9_

- [x] 4. Pings and acknowledgements in the core
  - [x] 4.1 Create `src/core/pings.ts` (`detectPings`); unit tests (baseline, the same list twice, `TURN_DONE` → `WORKING` → `TURN_DONE`, a new Codex session first seen in `TURN_DONE`, several pings in one list); P17, P18
    - _Requirements: 8.1–8.3_
  - [x] 4.2 Create `src/core/attention.ts`: inbox records and their validation, `foldInbox`, `ackRecords`, `unackedSessions`, `menuCount`, hidden marks; unit tests (each way of acknowledging, `Mark all read`, a new turn, a baseline `TURN_DONE`, a hidden `WAITING_APPROVAL`); P19, P20, P23, and the inbox half of P25
    - _Requirements: 5.3, 10.1–10.9, 11.1, 13.1–13.5_
  - [x] 4.3 Create `src/core/snapshot.ts` (types only)

- [x] 5. Checkpoint: core
  - All tests pass. `src/core` imports nothing outside `src/core` and no `node:` modules (check with a grep). Every file stays under about 200 lines.
  - Result (2026-11-12): 316 tests pass; `src/core` imports only `./` files, and uses no clock, timers, environment, file system, network or DOM (grep). Longest core file: `buddies.ts`, 187 lines. Test files that grew past 200 lines in this spec were split (`hook-helpers.ts`, `state-helpers.ts`, `session-end.test.ts`, `hidden.test.ts`, `inbox.prop.test.ts`). Three test files were already over 200 lines before this spec and are unchanged in size: `tests/fixtures/payloads.ts` (209), `tests/unit/relay.test.ts` (283), `tests/property/state.prop.test.ts` (291, one line more).

- [x] 6. `startRelay()` and shared UI file lookup
  - [x] 6.1 Base folder parameter in `home.ts`; create `src/relay/start.ts` (`startRelay`, `PortInUseError`, `stop()`); reduce `main.ts` to the command wrapper with the same messages and exit codes
    - _Requirements: 3.1–3.6_
  - [x] 6.2 Create `src/relay/static.ts` (`resolveUiFile`, content types with `.ttf` and `.txt`); use it in `server.ts`
  - [x] 6.3 Tests: `startRelay` in-process with a temp home (start, `stop()`, port in use leaves nothing listening); the existing relay tests pass unchanged
    - _Requirements: 3.3, 3.5, 17.1_
  - [x] 6.4 Steering: structure.md lists `src/relay/start.ts` and `static.ts`

- [x] 7. App main process: plain modules
  - [x] 7.1 `src/app/config.ts`, `ipc.ts` (channels and validators), `window-options.ts`, `popup-layout.ts`, `icon.ts`; unit tests for the validators and the window flags; P22
    - _Requirements: 5.8, 9.6, 15.1–15.3_
  - [x] 7.2 `sse.ts` (parser and `parseViews`); unit tests (chunk splits, comments, the 4 MB cap, malformed views dropped, a core-pipeline relay's list accepted)
    - _Requirements: 4.5_
  - [x] 7.3 `jump.ts` (`planJump`, `runJump`); unit tests with a recording `exec` (running check first, not running, unknown ID, timeout, folder only under Req 12.7); P24
    - _Requirements: 12.1–12.12_
  - [x] 7.4 `settings.ts` and `inbox-file.ts`; unit tests (defaults, invalid files, mode 600, atomic save, bad lines skipped); the settings half of P25
    - _Requirements: 11.2, 11.4, 11.5, 14.2, 14.3_
  - [x] 7.5 `relay-link.ts` with injected `start` and `connect`; unit tests (own, attached, no list within 5 s → `foreign`, drop → retry → own, stall)
    - _Requirements: 4.3–4.7, 4.9_
  - [x] 7.6 `controller.ts` with ports; end-to-end unit tests on fake ports and a fake clock (pop-ups, ding calls, records, count, snapshots; the pop-up × acknowledges without jumping, `Later` acknowledges nothing; hide-text keeps text out of every port that shows something: window snapshots, pop-ups, notifications)
    - _Requirements: 7.4, 8.4, 8.5, 9.7, 10, 13, 14_

- [x] 8. App main process: Electron
  - [x] 8.1 `security.ts` and `protocol.ts`
    - _Requirements: 15.1–15.6, 16.3_
  - [x] 8.2 `windows.ts`, `popups.ts`, `tray.ts`, `notify.ts`, with the O4 results applied
    - _Requirements: 5, 8.8, 8.9, 9_
  - [x] 8.3 `preload-main.ts` and `preload-popup.ts`
    - _Requirements: 15.2_
  - [x] 8.4 `main.ts` wiring; three new `build:node` entries; `npm run app`
    - Also: a plain `popup.html` and `src/ui/screens/popup.ts` (styled in 10.4), and a stop-gap app bridge in `src/ui/main.ts` so the old list shows in the app window (replaced in 10.6). Electron's own data goes to `~/.agentbuddy/electron` (`app.setPath('userData')`). SIGINT and SIGTERM quit the app cleanly.
    - _Requirements: 4.1, 4.2_
  - [x] 8.5 First run with the builder, announced first: the app attaches to the running relay and shows the old list in its window; the tray icon appears; quitting leaves the relay running. While it runs, `lsof -nP -i -a -p <pid>` shows only `127.0.0.1` connections. Also from O4: the tray icon and its title are visible, whether a Dock icon flashes at start, and a pop-up click brings Kiro forward from behind another app. Confirm the app process is gone after quitting.
    - Run 1 (2026-11-13, 23:32 UTC, Electron 45.3.1, macOS 26.6.2): the app ran 46 s and quit on SIGTERM with exit 0 in under 2 s; no Electron process was left; the relay (pid 688) kept running. One 320×620 window at the top-right of the main display (layer 3, floating). Chrome stayed in front 8 s after start, so showing the window took no focus. Application type `UIElement` (no Dock icon) while running. Electron's data went to `~/.agentbuddy/electron` (mode 700); `~/Library/Application Support/Electron` did not change. No output on stdout or stderr. The builder saw the full buddy list (so the app attached to the running relay) but no menu bar icon, and did not watch the Dock. The socket check missed the main process (launched by a relative path, so the process match failed), so which connections it held is not measured. Electron's preferences hold no `NSStatusItem` keys, so the icon was not removed by Cmd-dragging. The main display is a built-in notched 3024 × 1964 panel (1512 × 982 points), where menu bar items that do not fit are hidden; whether that is the cause is UNVERIFIED.
    - Run 2 (2026-11-13, 23:41 UTC): 16 s, quit on SIGTERM with exit 0; no process left; relay unchanged. The main process held exactly one network socket, `127.0.0.1:51712 -> 127.0.0.1:4343` (ESTABLISHED); the helper processes held none. `UIElement` again. This time Electron was the frontmost app 6 s after start (in run 1 Chrome stayed in front), so whether showing the main window at start takes focus is not settled. No window of layer 25 (status items) is owned by Electron, on or off screen; on macOS 26.6.2 the status item windows on screen are owned by Control Center (28 on screen, 5 off screen with the app not running), so this check cannot tell whether the tray icon exists or is hidden.
    - Run 3, the pop-up click (2026-11-13, 23:44 UTC): 46 s with a temp HOME and port 4399, so the app started its own relay; three fake Kiro turns (`bundleId` `dev.kiro.desktop`, `cwd` this repository) each pinged. Each pop-up appeared as a 300×136 window at the bottom-right. After the first one the builder's other app (KakaoTalk) stayed in front, so the pop-up took no focus. The builder clicked it about 5 s later: an `ack` record was written and Kiro became the frontmost app 1 s later, so a pop-up click brings Kiro forward from behind another app (with the folder argument). Electron was frontmost at the start (as in run 2), at 18 s and at 40 s; at 40 s the third pop-up appeared and the main window had moved by 21 × 6 points, and the builder confirmed clicking the main window at 18 s and 40 s, so no pop-up took focus. The main process held only its own relay's listener on `127.0.0.1:4399` and its own stream connection to it; after SIGTERM (exit 0) port 4399 was free, no Electron process or watcher was left, and the main relay was unchanged. The temp HOME held only `.agentbuddy/` (`electron/`, the daily log, the inbox with 3 pings and 1 ack, the token); it was deleted afterwards. Not checked: stacking of several pop-ups at once (each closed before the next).
    - Closed on 2026-11-13 with the builder's OK: the menu bar icon stays UNVERIFIED and is checked in task 11. Showing the main window at start took focus in runs 2 and 3; kept, since the user starts the app.
    - _Requirements: 4.4, 4.7, 16.3_

- [x] 9. Look: fonts, tokens, icons
  - [x] 9.1 With the builder's OK, copy the four font files and the two OFL texts from the Google Fonts repository into `src/ui/public/fonts/`; `publicDir` in `vite.config.ts`; `styles/fonts.css` and `styles/tokens.css`
    - _Requirements: 6.11, 16.5_
  - [x] 9.2 `src/ui/icons.ts` (seven state icons, the crescent as one path, the bubble)
    - _Requirements: 5.8, 6.7, 6.13_
  - [x] 9.3 `contrast.test.ts` (every text pair at least 4.5:1) and `ui-build.test.ts` (fonts and licenses in `dist/ui`, no `http:` or `https:` in built files)
    - _Requirements: 6.13, 16.5, 17.1_
  - Result (2026-11-13): fonts downloaded once with the builder's OK from `https://raw.githubusercontent.com/google/fonts/main/ofl/{nanumgothic,silkscreen}/` (6.3 MB in all). SHA-256: NanumGothic-Regular `76f45ef4…2e2d31`, Bold `f96298f9…33c674`, ExtraBold `5c4568e5…e691ae`, Silkscreen-Regular `c8454733…642ebd8`, OFL-NanumGothic `eeacf160…6c30f`, OFL-Silkscreen `86c5e9c9…efbd3`. Both licenses read `SIL OPEN FONT LICENSE Version 1.1`. Also: `--on-fill` token, `styles/icons.css` (icon colors by class), `src/ui/env.d.ts` for stylesheet imports; the three stylesheets are imported by both pages already. Contrast: icon-only button glyphs count as graphics (3:1); footer dots join the rings as known exceptions (see design "Contrast").

- [x] 10. UI screens
  - [x] 10.1 `model/list.ts`, `model/chrome.ts`, `model/inbox.ts`; unit tests (online counts, offline group, same-name folders, `[n]`, session rows only for two or more visible sessions, the buddy-row × only with exactly one visible session, the hidden-sessions line, alert strip, per-tab footer, connections, browser mode); P26
    - _Requirements: 5.10, 5.11, 6.1–6.10, 11.3, 14.1_
  - [x] 10.2 `index.html`, `chrome.ts` and `styles/main.css` (title bar, alert strip, tabs, footer)
    - _Requirements: 5.9–5.11, 6.11, 6.13_
  - [x] 10.3 `screens/list.ts`, `screens/inbox.ts`, `screens/settings.ts`
    - _Requirements: 6, 11.3, 11.6, 13.1, 14.1_
  - [x] 10.4 `popup.html`, `screens/popup.ts`, `styles/popup.css`
    - _Requirements: 9.1, 9.5, 9.7, 9.9_
  - [x] 10.5 `sound.ts`; the builder hears the ding (not confirmed in O4) and tunes the two notes by ear, announced first
    - _Requirements: 8.6, 8.7_
  - [x] 10.6 `bridge.ts` and `main.ts` (app and browser sources); remove the old table code and its test
    - _Requirements: 6.12_
  - [x] 10.7 Visual check with the builder, announced first: the three tabs next to `Main.dc.html`, `Inbox.dc.html` and `Settings.dc.html`, and a ping pop-up next to `Popup.dc.html`; the builder opens the relay's page in a browser and sees the same list without the app-only parts. Also from O4: height resize, title bar drag, the corners, and whether a transparent main window still resizes (if it does, the corners become 10/10/4/4)
    - _Requirements: 6.11, 6.12_

  - Result (2026-11-13, 00:08–00:11 UTC): one 3-minute run of the new build attached to the real relay (pid 688); the builder caused the pings with real Claude prompts in another folder. The builder confirmed the three tabs against the mockups, title bar drag, height resize, the ding (default notes, not changed), the pop-up, and that focus stayed in the app in use. The inbox got two Claude `TURN_DONE` pings and one `ack` 5 s after the first. Afterwards no Electron process, check script or watcher was left, no Electron singleton lock was left (clean quit), and the relay was unchanged. The tool call that ran the check was cut off before it reported, so the exit status and the watcher's focus log were lost. Not checked here, moved to task 11: the relay's page in a browser, and the window corners. The main window stays opaque with 10 px corners all round (a transparent main window was never tried).

- [x] 11. Checkpoint: builder checks
  - Each check of Req 17.3 with the builder, each announced first and run once, plus a pop-up over a full-screen app (from O4), and from 10.7: the relay's page in a browser (same list, no app-only parts) and the main window corners.
  - Menu bar icon (from 8.5): the builder looks for the bubble and its count. If it is not visible, count Control Center's menu bar windows (layer 25) on and off screen with the app running and quit; one more off-screen window means the icon exists but is hidden (a full menu bar on a notched display), none more means it was not created. Then decide with the builder what to do.
  - Read the launcher values the daily log collected since task 2 (only `agent`, `bundleId`, `termProgram`) and record them in events.md as observed, with date and versions; mark what did not arrive.
  - Run A (2026-11-13, 00:21:31–00:27:33 UTC, 360 s, relay restarted from the new build first: pid 86955, 219 events restored): log written to a file while running. The main process held only `127.0.0.1:53217 -> 127.0.0.1:4343`. SIGTERM at 360 s, exit 0; no Electron process, watcher or singleton lock left; relay unchanged; settings file mode 600. Seen in the log: the main window took focus at start (as in 8.5); it was hidden at 51 s and shown again at 60 s at its first place (the app has no Dock icon, so this points to the menu bar menu); then dragged to the external display (3040, -1035). A Claude click at 12 s (`ack`) was followed by Kiro in front at 13 s: a Claude CLI session in a Kiro terminal, now jumped to without a folder. A Claude `TURN_DONE` ping at 172 s showed one pop-up while Chrome stayed in front; an `ack` 5 s later was followed by the Claude app in front. Menu bar status windows owned by Control Center: 28 on / 2 off before start, 30 on / 3 off with the app running, 28 on / 5 off after quit. Not shown by the log: a ping while the main window was hidden, a Kiro ping, a pop-up over a full-screen app, the browser page.
  - Run B (2026-11-13, 00:29:46–00:30:25 UTC, 39 s, temp HOME, port 4399, hide-text preset on): three fake Claude turns ended 1 s apart; three pop-ups stacked upward at y 775, 629 and 483 (146 points apart: 136 + 10 gap), and as each closed after 6 s the rest moved down, oldest first. After SIGTERM (exit 0) and a restart with the same home and port, the restored `TURN_DONE` sessions gave no pop-up for 13 s and no new inbox ping (3 before and after). Both runs exited 0; no process left; port 4399 free; the main relay unchanged; the temp home deleted. The inbox file keeps session titles by design; the settings file held no agent text. Whether the pop-ups and the main window showed no agent text with hide-text on is for the builder to confirm.
  - Builder confirmed (2026-11-13, after runs A and B): the relay's page in a browser; the menu bar icon; a ping with the main window closed; a Kiro ping from another chat; a pop-up over a full-screen app; three stacked pop-ups with no agent text under hide-text. Whether a new Kiro window opened on the two Claude-in-Kiro-terminal clicks was not stated.
    - Done 2026-11-13: Claude app `com.anthropic.claudefordesktop` (no `TERM_PROGRAM`), Claude CLI in VS Code `com.microsoft.VSCode` / `vscode`, Claude CLI in a Kiro terminal `dev.kiro.desktop` / `kiro`, Kiro IDE chat `dev.kiro.desktop` (no `TERM_PROGRAM`). Not arrived: Kiro task runs, Codex.
  - _Requirements: 17.3_

- [x] 12. Steering, README and final checkpoint (after task 13, builder's order of 2026-11-13)
  - Steering: tech.md "Pieces", "Commands", "Sound"; structure.md (`src/app`, the new core and UI files, who touches files and network); product.md core flow step 2.
  - README: `npm run app`, own and attached relays, the new files in `~/.agentbuddy/`, Electron and the two fonts with their licenses in the third-party table, and the known limits from the design.
  - All tests pass and `npm run build` succeeds. Grep for `/Users/` paths other than `/Users/dev/`, user names and token-like strings. `.gitignore` does not list `.kiro`.
  - _Requirements: 17.4, 17.5_
  - Result (2026-11-13): tech.md (stack, Pieces 2, 3 and a new 5, Local only, Sound, Commands, the messenger-app properties), structure.md (`src/app`, the new core and UI files, import and side-effect rules), product.md (core flow step 2), README (desktop app section, stored files, known limits, Electron and the two fonts). 505 tests pass, typecheck and `npm run build` succeed. `src/app/controller.ts` had grown to 221 lines, so its port types moved to `src/app/controller-ports.ts` (now 203 and 30 lines). Grep of every tracked and untracked file: no `/Users/` path other than `/Users/dev/`, no user name, no token-like string; the real token is in no file and in no commit. `.gitignore` lists `node_modules/`, `dist/`, `.DS_Store` only. `master` holds no commit with the old author e-mail (the one with the machine's host name); the local branch `backup/before-author-rewrite` still does (30 commits) and is not to be pushed.

- [x] 13. My status row (required since 2026-11-13, Req 18)
  - [x] 13.1 Spec: Requirement 18, design "My status row", decisions A13 and A14 (corners stay 10 px all round)
  - [x] 13.2 `cleanMyStatus` in `src/core/text.ts`; `myStatus` in `PublicSettings`, `parseSettings`, `serializeSettings`; `ui:status` and its check; `controller.onStatus`; `setStatus` in the main preload; unit tests and P25 updated
    - _Requirements: 18.4–18.6_
  - [x] 13.3 `model/me.ts`, `screens/me.ts`, the row in `index.html`, the `--me-*` tokens and their styles; contrast pairs; unit tests for `meView` and `limitStatusInput`
    - _Requirements: 18.1–18.3, 18.7, 18.8_
  - [x] 13.4 Visual check with the builder, announced first: the row next to `Main.dc.html`, editing with Enter, Esc, a click outside, Korean input, and the 40-code-point cap
    - _Requirements: 18.1–18.4_
  - Result so far (2026-11-13): 505 tests pass. Moving focus out of the field cancels, like Esc (Req 18.3). The hint uses `--me-hint` = `--text-2`, because no lighter palette color keeps 4.5:1 on white (`--stale` 4.35). `parseSettings` first took a saved `null` as a message (`cleanMyStatus(null) === null`); the new unit test caught it before the commit. The contrast test now resolves alias tokens and checks that every `.me-*` rule uses only `--me-*` variables and no literal radius.
  - Run (2026-11-13, 01:05:45–01:07:18 UTC, 90 s, attached to the relay, pid 86955): the settings file got `myStatus` twice, two Korean letters at 01:06:16 and a 40-code-point Korean string at 01:06:38 (the cap held); nothing else was saved. The main process held only `127.0.0.1:54807 -> 127.0.0.1:4343`. Exit 0 on SIGTERM; no Electron process left; the relay unchanged; settings file mode 600; neither `~/Library/Application Support/Electron` nor `.../AgentBuddy` was created. The app printed one macOS input-method line (`error messaging the mach port for IMKCFRunLoopWakeUpReliable`) when Korean input began; nothing followed from it. The builder confirmed: the row matches `Main.dc.html`, the hint shows when empty, Esc and a click outside bring the old message back, and Enter during a Korean composition only ends the composition.
  - Also in this task: `app.setName('AgentBuddy')` in `src/app/main.ts`. Run from source as `electron dist/app/main.cjs`, Electron's default app reads `package.json` only from the folder it is given, so `productName` in the root `package.json` would not apply (read from `default_app.asar`, Electron 45.3.1). `userData` was already `~/.agentbuddy/electron`. `~/Library/Application Support/Electron` (written 2026-11-12 08:10–08:24 UTC, the O4 runs) was deleted with the builder's OK. `~/Library/Preferences/com.github.Electron.plist` was kept: it was last written 2026-11-13 00:30:14 UTC (task 11 run B), not by O4, and macOS keys it by the Electron binary's bundle ID, which `setName` does not change, so every run from source writes it again.

- [ ]* 14. Packaged `.app` (optional, unsigned)
  - Only if time allows and the builder asks for it.

## Handoff for the next session (2026-11-13, after task 12)

State: tasks 1–13 are done and committed; 505 tests pass. Optional task 14 (packaged `.app`) is open. The relay runs detached from an earlier build (pid 86955, output in `~/.agentbuddy/relay.log`; stop with `kill 86955`); restarting it from the latest build is not needed for this spec. No app or check process is running.

Next: the builder brings the material for a theme spec (Blue Bot / Strawberry Milk). Starting points for it: the `--me-*` tokens in `src/ui/styles/tokens.css` (values only), `--me-hint` (no palette color lighter than `--text-2` keeps 4.5:1 on white), the main window corners (16–18 px) with one transparent-window check (A14), and `tests/unit/contrast.test.ts`, which already resolves alias tokens.

Open, outside this spec: the local branch `backup/before-author-rewrite` holds 30 commits with the old author e-mail (machine host name); whether to delete it is the builder's call. `~/Library/Preferences/com.github.Electron.plist` is written again by every run from source. The builder left blank whether a new Kiro window opened on the two Claude-in-Kiro-terminal clicks; the rule stays.

Working rules used so far: report to the builder in Korean; one commit per task, files staged by name; announce every check that shows windows or plays sound, say "지금 띄웁니다" right before it, run it once with a fixed time limit, write its results to a file while it runs (a detached script that stops the app by itself), and confirm no process is left before reporting.
