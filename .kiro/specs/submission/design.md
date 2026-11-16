# Design: Demo and submission

## Overview

The demo reuses the product instead of imitating it. The main window page and the pop-up page are the app's own UI modules (`src/ui/main.ts`, `src/ui/screens/popup.ts`), unchanged. They already take their state from a bridge object (`window.agentbuddy`, `window.agentbuddyPopup`), which the Electron preloads provide in the app. In the demo, a **host** on the demo page provides the same bridges, and behind them runs the app's own controller (`src/app/controller.ts`, plain TypeScript with ports) on lists that the core builds from the scenario.

```
demo/index.html  (intro text, Start demo, the host)
 ├─ <iframe demo/window.html>   main window UI (src/ui/main.ts) ◄─ window.agentbuddy  = host.mainBridge()
 ├─ <iframe demo/popup.html> ×n pop-up UI (src/ui/screens/popup.ts) ◄─ window.agentbuddyPopup = host.popupBridge(id)
 └─ host (src/demo/host.ts)
      scenario (demo/events.json) ─► core: validateEvent, applyEvent, toViews ─► controller.onList ─► ports
      ports: pushState → main bridge, showPopup → pop-up iframes, ding → src/ui/sound.ts, jump/notify/window → notice
```

Why iframes: each UI page assumes it owns its document (`popup.ts` fills the one `.card`; `main.css` and `popup.css` style `html` and `body`). An iframe per page keeps both pages exactly as in the app, with no change to `src/ui`, and lets several pop-ups stack. All frames are same-origin, so a frame's entry module can ask its parent for its bridge before it loads the UI module.

Why the host plays the ding: browsers allow audio only after a user gesture in the same frame (or an ancestor). The `Start demo` click is on the demo page, so the host's `ding` port plays `src/ui/sound.ts` there. The main window's `onDing` callback is never called, so the ding sounds once.

## Files

```
demo/
  index.html        the demo page: intro, Start/Replay, frame slots; loads src/demo/page.ts
  window.html       body = index.html's window markup; loads src/demo/window-entry.ts
  popup.html        body = popup.html's card markup; loads src/demo/popup-entry.ts
  events.json       the scenario (sanitized, invented)
src/demo/
  scenario.ts       pure: parse and check events.json; stamp events with a start time
  replay.ts         pure: events due between two offsets; list + progress after them
  ports.ts          pure-ish: the controller's ports for the demo (notice texts, app names)
  host.ts           the host: timers, controller, frames, bridges (DOM)
  page.ts           demo page entry: Start/Replay buttons, creates the host
  window-entry.ts   sets window.agentbuddy from the parent host, then imports src/ui/main.ts
  popup-entry.ts    sets window.agentbuddyPopup from the parent host, then imports src/ui/screens/popup.ts
  styles/demo.css   the demo page layout only (no colors outside the skin tokens)
vite.demo.config.ts the demo build: root `demo/`, base './', publicDir src/ui/public, out dist/demo
.github/workflows/pages.yml
docs/submission/description.md, kiro.md, video.md
docs/demo.png       README screenshot
```

`window.html` and `popup.html` copy the body markup of the root `index.html` and `popup.html`. A unit test keeps them equal (everything inside `<body>` except the `<script>` line), so a later change to the app's markup cannot drift.

## Scenario format (`demo/events.json`)

```json
{
  "v": 1,
  "progress": { "kiro:/Users/dev/agentbuddy": "/Users/dev/agentbuddy/.kiro/specs/inbox/tasks.md" },
  "events": [
    { "t": -300, "event": { "agent": "codex", "session": "01a1…", "kind": "stop", "cwd": "/Users/dev/notes-api", "text": "…", "firstInput": "…" } },
    { "t": 2, "event": { "agent": "kiro", "session": "sess_aa…", "kind": "task_start", "cwd": "/Users/dev/agentbuddy", "task": { "name": "3. Add the inbox", "specPath": "…/tasks.md" }, "bundleId": "dev.kiro.desktop" }, "progress": { "done": 2, "total": 8 } }
  ]
}
```

- `t`: seconds from the start; negative values happened before it.
- `event`: a `BuddyEvent` without `v` and `at`; `scenario.ts` adds `v: 1` and `at = startMs + t × 1000` (ISO), then runs `validateEvent`. A scenario event that fails is a parse error (tested), never skipped silently.
- `progress`: on Kiro task and stop events only, the `{ done, total }` the relay would read from `tasks.md` at that event (Req 3.4). The host keeps it per buddy key and passes it to `toViews`, like the relay's progress map. No file is read.
- `parseScenario(json)` returns the scenario or a list of errors; it never throws (same rule as the core).

## Scenario timeline (about 60 s)

Agents, folders and launchers (all invented, under `/Users/dev/`):

| Buddy | Folder | Launcher | Shows |
|---|---|---|---|
| Kiro @ agentbuddy | `/Users/dev/agentbuddy` | `dev.kiro.desktop` | spec task runs, progress 2/8 → 5/8 |
| Claude Code @ webshop | `/Users/dev/webshop` | `com.anthropic.claudefordesktop` | prompt, tools, approval ping, tools again (BF5), finished turn ping |
| Codex @ notes-api | `/Users/dev/notes-api` | none (Codex app, fix F3) | an earlier finished turn, then a new finished turn ping |

| t (s) | Event | What the judge sees |
|---|---|---|
| −300 | Codex `stop` (first input `write tests for the notes API`) | baseline: Codex done 5 min ago (no ping) |
| −120 | Kiro `prompt` in the chat session | baseline: Kiro working |
| 2 | Kiro `task_start` `3. Add the inbox` (new session, trap 6), 2/8 | Kiro `studying hard`, bar 2/8 |
| 4 | Claude `prompt` `add a dark mode toggle` | Claude working |
| 6–12 | Claude `tool` ×4 | stays working |
| 14 | Claude `permission` | needs-OK ping: ding, pop-up, alert strip, Inbox count 1 |
| 18 | Kiro `task_done` (success), 3/8; Kiro `task_start` `4. Mark all read`, 3/8 | bar moves |
| 24 | Claude `tool` | Claude working again (BF5) |
| 26–34 | Claude `tool` ×3 | working |
| 30 | Codex `stop` (reply about the tests) | turn-done ping for Codex |
| 36 | Kiro `task_done`, 4/8; `task_start` `5. Inbox screen`, 4/8 | bar moves |
| 42 | Claude `stop` `Dark mode toggle added; 3 files changed.` | turn-done ping for Claude |
| 52 | Kiro `task_done`, 5/8; Kiro `stop` | Kiro done; bar 5/8 |
| 58 | end | `Replay` button |

Pop-ups close by themselves after `POPUP_MS` (6 s), so at most three show at once; the inbox keeps all pings. The texts are short invented prompts and replies. Only observed mappings appear (Req 3.2): Kiro never asks for approval, Codex only finishes turns.

## Replay (`src/demo/replay.ts`, pure)

- `due(events, fromT, toT)`: the events with `fromT < t ≤ toT`, in scenario order.
- `applyDue(state, events)`: folds events into `{ list: SessionList, progress: Map<string, Progress>, seq }` with `applyEvent`; a Kiro event with `progress` sets the progress of its buddy key.
- `views(state, nowMs)`: `toViews(state.list, state.progress, nowMs)`.

## Host (`src/demo/host.ts`)

- **Start**: `startMs = Date.now()`. Apply events with `t ≤ 0`, then `controller.onList(views, true)` (baseline, never pings). Then a 250 ms interval: apply events due since the last tick, and when any were applied or 5 s passed, `controller.onList(views, false)`. Time-based states (`?`, idle) follow from `now` as in the relay's clock tick.
- **Controller**: `createController({ settings: DEFAULT_SETTINGS with alwaysOnTop false, records: [], port: 0 }, demoPorts)`.
  - Right after creating it, the host calls `controller.onLink('demo', 'ok')` once, so every snapshot has `mode: 'demo'` (see Snapshot mode).
  - `pushState(s)` → the main bridge's `onState` callback.
  - `showPopup(session, content)` → a new pop-up iframe (or the same one for the same session), closed after `POPUP_MS`; `closePopups(keys)` removes them.
  - `ding()` → `src/ui/sound.ts` `ding()` in the demo page.
  - `jump(plan)` → a notice: `In the app, this brings <app> forward.` with `<app>` from a fixed map (`dev.kiro.desktop` → `Kiro`, `com.anthropic.claudefordesktop` → `the Claude app`, `com.openai.codex` → `the Codex app`, other → the bundle ID); a `notice` plan shows its own text.
  - `notify(...)` → notice `In the app, this posts a macOS notification.`; `applyAlwaysOnTop`, `windowAction` → notice `Works in the desktop app.`
  - `appendInbox`, `saveSettings`, `setCount`: memory only (Req 4.5).
  - `applyTheme(t)` → every open pop-up bridge's `onTheme` callback.
  - `now()` = `Date.now()`; `dayKey`, `formatTime` as `src/app/main.ts` gives them (local time).
- **Main bridge**: the `AppBridge` methods map to the controller (`click` → `onClick`, `ackAll`, `hide`, `setSetting`, `setGroupOpen`, `setStatus`, `setTheme`, `windowAction`); `ready()` → `controller.refresh()`; notices go to the `onNotice` callback.
- **Pop-up bridge**: `go` → `onPopup(session, 'go')`, `close` → `'close'`, `later` → `'later'` (each also removes the frame, as `popups.ts` does in the app).
- **Replay**: stop the interval, remove the pop-up frames, reload the window frame (its UI state starts fresh), and start again with a new controller.
- **Stop**: nothing runs before `Start demo`; the interval stops at the end of the scenario plus 10 s (time-based states need no more ticks within a minute).

## Snapshot mode

`AppSnapshot.mode` is `'own' | 'attached' | 'connecting' | 'browser'` today (`src/core/snapshot.ts`). The demo adds `'demo'`:
- `src/ui/model/chrome.ts` `connections(s)` and the status bar text: `demo replay`, and Settings › Connections: `Demo: no relay, events are replayed in this page.` (Req 1.5).
- Everything that checks `mode !== 'browser'` (the TIP banner start, app-only parts) treats `demo` like the app.
This is the only change inside `src/core` and `src/ui`, covered by unit tests of the chrome model.

## Settings split

`src/app/controller.ts` imports `MAX_CLOSED_GROUPS` and `Settings` from `src/app/settings.ts`, which imports `node:fs/promises`. The pure parts (`Settings`, `DEFAULT_SETTINGS`, `MAX_CLOSED_GROUPS`, `MAX_HIDDEN`, `parseSettings`, `serializeSettings`) move to `src/app/settings-data.ts`; `settings.ts` keeps `loadSettings`/`saveSettings` and re-exports the rest, so no other import changes. The demo build then contains no Node built-in; the build fails if one slips in (Vite's browser build cannot resolve them), and a test checks that `dist/demo` holds no `node:` import.

## Build (`vite.demo.config.ts`)

- `root: 'demo'`, `base: './'` (works under `/agentbuddy/` and locally), `publicDir: '../src/ui/public'` (fonts and licenses), inputs `index.html`, `window.html`, `popup.html`, `outDir: '../dist/demo'`.
- The fonts are referenced as `/fonts/…` in `fonts.css`. With `base: './'`, Vite rewrites public-file URLs in CSS relative to the CSS file; a test reads the built CSS and checks every font URL resolves to a file in `dist/demo` (Req 5.2). If Vite does not rewrite them, the design falls back to `base: '/agentbuddy/'` for the Pages build only.
- `demo/events.json` is imported by `page.ts` (bundled), so the page makes no `fetch` at all.
- Scripts: `"demo": "vite --config vite.demo.config.ts"` (host `127.0.0.1`), `"build:demo": "vite build --config vite.demo.config.ts"`. `build` and `app` stay as they are (Req 5.3).

## Workflow (`.github/workflows/pages.yml`)

```yaml
on: { push: { branches: [master] }, workflow_dispatch: {} }
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:   # ubuntu-latest, Node 22, ELECTRON_SKIP_BINARY_DOWNLOAD=1
    steps: checkout@v4 → setup-node@v4 (cache npm) → npm ci → npm run build → npm test → npm run typecheck
           → npm run build:demo → configure-pages@v5 → upload-pages-artifact@v3 (dist/demo)
  deploy:  # needs build; environment github-pages
    steps: deploy-pages@v4
```

- `npm run build` runs before `npm test`, because the hook tests spawn `dist/hook.js`.
- `ELECTRON_SKIP_BINARY_DOWNLOAD=1` skips the Electron download in CI; no test starts Electron (tech.md).
- **UNVERIFIED**: whether every test passes on Linux (some spawn `/bin/sh` scripts; none should need macOS). Task 7 runs the workflow once; if a test needs macOS, the job moves to `macos-latest` rather than skipping the test.

## Publishing (Req 6)

A script `scripts/check-public.sh` (shell, read-only) runs before the first push and in the workflow:
- `git grep` over tracked files for `/Users/` paths other than `/Users/dev/`, the local user name, `~/.agentbuddy/token`'s content shape (64 hex), and UUID-shaped session IDs outside `.kiro/specs/*/tasks.meta.json`;
- `git log --format='%ae'` must list only `…@users.noreply.github.com`.

The user name and token are not written into the script; it reads them from the environment of the run (`$USER`, the token file), so the script itself holds nothing private.

Steps, each after the builder's OK: `gh repo create jasonethicseo/agentbuddy --public --source . --remote origin` (or the web UI), `git push -u origin master`, Pages source = GitHub Actions, About = description, demo URL, topics. `gh` is used only if installed and logged in; otherwise the builder does the step in the browser and Kiro checks the result.

## Screenshot (Q5)

One headless run, announced first: start `vite preview` of `dist/demo` on `127.0.0.1`, open it in a headless Chromium (Playwright from `npx`, or the Chrome already installed with `--headless=new --screenshot`), press `Start demo`, wait until t = 16 s (the needs-OK pop-up and the alert strip show), save `docs/demo.png`, close the browser and the server, and confirm both are gone. No window shows on the builder's screen. If Playwright would need a download, Kiro asks first.

## Testing

| Test | Checks |
|---|---|
| `tests/unit/demo-scenario.test.ts` | events.json parses; every event passes `validateEvent`; only `/Users/dev/` paths; no session ID longer than the shortened form; only kinds each agent really sends (Kiro no `permission`, Codex only `stop`) |
| `tests/unit/demo-criteria.test.ts` | replay with a fixed start and a fake-port controller, sampled every 250 ms to 60 s: three buddies change state; Kiro progress rises at least twice; a `WAITING_APPROVAL` ping with ding and pop-up; that Claude session `WORKING` after it; a second Claude ping (`TURN_DONE`); a Codex `TURN_DONE` ping (Req 3.1, 3.5) |
| `tests/property/demo-replay.prop.test.ts` | for any split of the 0–60 s span into ticks, the final views and the ping sequence are the same (Req 2.5) |
| `tests/unit/demo-markup.test.ts` | `demo/window.html` and `demo/popup.html` bodies equal the app's pages (minus the script line) |
| `tests/unit/demo-ports.test.ts` | notice texts for each jump plan, notify, window actions; nothing is stored |
| `tests/unit/demo-build.test.ts` | after `build:demo`: no `node:` import; no address but the repository link and the SVG namespace; every CSS `url()` and page asset resolves by a relative path. (The bundle still holds `src/ui/bridge.ts`'s `EventSource` code, which runs only without a bridge; `window-entry.ts` never loads the UI without one.) |
| chrome model tests | `mode: 'demo'` gives `demo replay` and the Connections line |

The hook, relay and app tests stay as they are.

## Error handling

- A broken `events.json` fails its unit test and the build's typecheck of the parse result; the page shows `The demo data is broken.` instead of an empty window.
- No sound device: `ding()` already catches; the pop-up and inbox still show.
- A frame that fails to load: the host keeps running; `Replay` reloads it.

## Requirement coverage

| Req | Where |
|---|---|
| 1 Demo page | `demo/index.html`, `page.ts`, `styles/demo.css`; mode `demo` |
| 2 Replay | `replay.ts`, `host.ts` |
| 3 Scenario | `events.json`, scenario and criteria tests |
| 4 Pop-ups and clicks | host ports and bridges, pop-up iframes |
| 5 Build and deploy | `vite.demo.config.ts`, scripts, `pages.yml` |
| 6 Publishing | `check-public.sh`, steps with the builder's OK |
| 7 README | README rewrite of the top, demo section, screenshot |
| 8 Submission texts | `docs/submission/*` |
| 9 Documents and checks | steering updates, final checks |
