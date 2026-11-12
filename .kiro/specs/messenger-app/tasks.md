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

- [ ] 5. Checkpoint: core
  - All tests pass. `src/core` imports nothing outside `src/core` and no `node:` modules (check with a grep). Every file stays under about 200 lines.

- [ ] 6. `startRelay()` and shared UI file lookup
  - [ ] 6.1 Base folder parameter in `home.ts`; create `src/relay/start.ts` (`startRelay`, `PortInUseError`, `stop()`); reduce `main.ts` to the command wrapper with the same messages and exit codes
    - _Requirements: 3.1–3.6_
  - [ ] 6.2 Create `src/relay/static.ts` (`resolveUiFile`, content types with `.ttf` and `.txt`); use it in `server.ts`
  - [ ] 6.3 Tests: `startRelay` in-process with a temp home (start, `stop()`, port in use leaves nothing listening); the existing relay tests pass unchanged
    - _Requirements: 3.3, 3.5, 17.1_
  - [ ] 6.4 Steering: structure.md lists `src/relay/start.ts` and `static.ts`

- [ ] 7. App main process: plain modules
  - [ ] 7.1 `src/app/config.ts`, `ipc.ts` (channels and validators), `window-options.ts`, `popup-layout.ts`, `icon.ts`; unit tests for the validators and the window flags; P22
    - _Requirements: 5.8, 9.6, 15.1–15.3_
  - [ ] 7.2 `sse.ts` (parser and `parseViews`); unit tests (chunk splits, comments, the 4 MB cap, malformed views dropped, a core-pipeline relay's list accepted)
    - _Requirements: 4.5_
  - [ ] 7.3 `jump.ts` (`planJump`, `runJump`); unit tests with a recording `exec` (running check first, not running, unknown ID, timeout, folder only under Req 12.7); P24
    - _Requirements: 12.1–12.12_
  - [ ] 7.4 `settings.ts` and `inbox-file.ts`; unit tests (defaults, invalid files, mode 600, atomic save, bad lines skipped); the settings half of P25
    - _Requirements: 11.2, 11.4, 11.5, 14.2, 14.3_
  - [ ] 7.5 `relay-link.ts` with injected `start` and `connect`; unit tests (own, attached, no list within 5 s → `foreign`, drop → retry → own, stall)
    - _Requirements: 4.3–4.7, 4.9_
  - [ ] 7.6 `controller.ts` with ports; end-to-end unit tests on fake ports and a fake clock (pop-ups, ding calls, records, count, snapshots; the pop-up × acknowledges without jumping, `Later` acknowledges nothing; hide-text keeps text out of every port)
    - _Requirements: 7.4, 8.4, 8.5, 9.7, 10, 13, 14_

- [ ] 8. App main process: Electron
  - [ ] 8.1 `security.ts` and `protocol.ts`
    - _Requirements: 15.1–15.6, 16.3_
  - [ ] 8.2 `windows.ts`, `popups.ts`, `tray.ts`, `notify.ts`, with the O4 results applied
    - _Requirements: 5, 8.8, 8.9, 9_
  - [ ] 8.3 `preload-main.ts` and `preload-popup.ts`
    - _Requirements: 15.2_
  - [ ] 8.4 `main.ts` wiring; three new `build:node` entries; `npm run app`
    - _Requirements: 4.1, 4.2_
  - [ ] 8.5 First run with the builder, announced first: the app attaches to the running relay and shows the old list in its window; the tray icon appears; quitting leaves the relay running. While it runs, `lsof -nP -i -a -p <pid>` shows only `127.0.0.1` connections. Also from O4: the tray icon and its title are visible, whether a Dock icon flashes at start, and a pop-up click brings Kiro forward from behind another app. Confirm the app process is gone after quitting.
    - _Requirements: 4.4, 4.7, 16.3_

- [ ] 9. Look: fonts, tokens, icons
  - [ ] 9.1 With the builder's OK, copy the four font files and the two OFL texts from the Google Fonts repository into `src/ui/public/fonts/`; `publicDir` in `vite.config.ts`; `styles/fonts.css` and `styles/tokens.css`
    - _Requirements: 6.11, 16.5_
  - [ ] 9.2 `src/ui/icons.ts` (seven state icons, the crescent as one path, the bubble)
    - _Requirements: 5.8, 6.7, 6.13_
  - [ ] 9.3 `contrast.test.ts` (every text pair at least 4.5:1) and `ui-build.test.ts` (fonts and licenses in `dist/ui`, no `http:` or `https:` in built files)
    - _Requirements: 6.13, 16.5, 17.1_

- [ ] 10. UI screens
  - [ ] 10.1 `model/list.ts`, `model/chrome.ts`, `model/inbox.ts`; unit tests (online counts, offline group, same-name folders, `[n]`, session rows only for two or more visible sessions, the buddy-row × only with exactly one visible session, the hidden-sessions line, alert strip, per-tab footer, connections, browser mode); P26
    - _Requirements: 5.10, 5.11, 6.1–6.10, 11.3, 14.1_
  - [ ] 10.2 `index.html`, `chrome.ts` and `styles/main.css` (title bar, alert strip, tabs, footer)
    - _Requirements: 5.9–5.11, 6.11, 6.13_
  - [ ] 10.3 `screens/list.ts`, `screens/inbox.ts`, `screens/settings.ts`
    - _Requirements: 6, 11.3, 11.6, 13.1, 14.1_
  - [ ] 10.4 `popup.html`, `screens/popup.ts`, `styles/popup.css`
    - _Requirements: 9.1, 9.5, 9.7, 9.9_
  - [ ] 10.5 `sound.ts`; the builder hears the ding (not confirmed in O4) and tunes the two notes by ear, announced first
    - _Requirements: 8.6, 8.7_
  - [ ] 10.6 `bridge.ts` and `main.ts` (app and browser sources); remove the old table code and its test
    - _Requirements: 6.12_
  - [ ] 10.7 Visual check with the builder, announced first: the three tabs next to `Main.dc.html`, `Inbox.dc.html` and `Settings.dc.html`, and a ping pop-up next to `Popup.dc.html`; the builder opens the relay's page in a browser and sees the same list without the app-only parts. Also from O4: height resize, title bar drag, the corners, and whether a transparent main window still resizes (if it does, the corners become 10/10/4/4)
    - _Requirements: 6.11, 6.12_

- [ ] 11. Checkpoint: builder checks
  - Each check of Req 17.3 with the builder, each announced first and run once, plus a pop-up over a full-screen app (from O4).
  - Read the launcher values the daily log collected since task 2 (only `agent`, `bundleId`, `termProgram`) and record them in events.md as observed, with date and versions; mark what did not arrive.
  - _Requirements: 17.3_

- [ ] 12. Steering, README and final checkpoint
  - Steering: tech.md "Pieces", "Commands", "Sound"; structure.md (`src/app`, the new core and UI files, who touches files and network); product.md core flow step 2.
  - README: `npm run app`, own and attached relays, the new files in `~/.agentbuddy/`, Electron and the two fonts with their licenses in the third-party table, and the known limits from the design.
  - All tests pass and `npm run build` succeeds. Grep for `/Users/` paths other than `/Users/dev/`, user names and token-like strings. `.gitignore` does not list `.kiro`.
  - _Requirements: 17.4, 17.5_

- [ ]* 13. My status row (design.md, optional)
  - Only if the builder adds it to the requirements: `me`, the bubble tile and an editable status message stored in `app-settings.json`.

- [ ]* 14. Packaged `.app` (optional, unsigned)
  - Only if time allows and the builder asks for it.
