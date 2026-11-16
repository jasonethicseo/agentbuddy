# Tasks: Demo and submission

Working rules (from earlier specs): report to the builder in Korean; one commit per task, files staged by name; announce every check that opens a window, a browser or plays sound, run it once with a fixed time limit, and confirm nothing is left running; nothing is pushed, published or made public without the builder's OK.

- [x] 1. Demo mode in the snapshot, and the pure settings module
  - Move `Settings`, `DEFAULT_SETTINGS`, `MAX_CLOSED_GROUPS`, `MAX_HIDDEN`, `parseSettings`, `serializeSettings` from `src/app/settings.ts` to `src/app/settings-data.ts`; `settings.ts` keeps load and save and re-exports the rest. `src/app/controller.ts` imports from `settings-data.ts`.
  - Add `'demo'` to `RelayMode`; the chrome model shows `demo replay` in the status bar and `Demo: no relay, events are replayed in this page.` in Settings › Connections; everything that checks `mode !== 'browser'` treats `demo` like the app.
  - Unit tests for both; all existing tests pass unchanged.
  - _Requirements: 1.5, 2.2_

- [x] 2. Scenario and replay (pure)
  - [x] 2.1 `src/demo/scenario.ts`: `parseScenario` (never throws; errors listed) and `stampEvents(scenario, startMs)`.
  - [x] 2.2 `src/demo/replay.ts`: `due`, `applyDue`, `views`, with the progress map per buddy key.
  - [x] 2.3 `demo/events.json`: the timeline of the design, invented texts, `/Users/dev/` paths, short IDs.
  - [x] 2.4 Tests: `demo-scenario.test.ts` (format, paths, IDs, kinds per agent), `demo-criteria.test.ts` (every criterion of Req 3.1 within 60 s, with a fake-port controller), `demo-replay.prop.test.ts` (any tick split gives the same views and pings).
  - _Requirements: 2.1, 2.3, 2.5, 3.1–3.5_
  - Result (2026-11-16): `createDriver` in `replay.ts` holds the step rule (a new list on new events or every 5 s), so the host and the tests run the same steps. The Codex baseline turn is 15 minutes old, so Codex changes state (idle, then a finished turn). Kiro task-run events carry no launcher (events.md: unverified for task runs). The scenario test caught `GET /notes` in a sample reply (no `/` in texts); the criteria test fails when the Claude tool events after the approval are removed (checked once).

- [x] 3. Demo ports and host
  - [x] 3.1 `src/demo/ports.ts`: the controller's ports for the demo, with the notice texts of the design and the app-name map; memory-only inbox and settings.
  - [x] 3.2 `src/demo/host.ts`: start (baseline, then a 250 ms tick), main and pop-up bridges, pop-up frames closed after `POPUP_MS`, the ding in the demo page, `Replay` (fresh controller, frames reloaded), stop after the end.
  - [x] 3.3 `demo-ports.test.ts`: each jump plan, notify, window actions and the pin give their notice; nothing is stored.
  - _Requirements: 2.2, 2.4, 4.1–4.5_
  - Result (2026-11-16): the host has no unit test of its own (it is DOM and timers only; the repo has no DOM test environment); its steps are `createDriver` and the controller, both tested, and it is checked in the browser in task 5. Pop-up capacity follows the page height, the oldest closing first, as `popups.ts` does with the screen.

- [x] 4. Demo pages
  - `demo/index.html` (heading, three lines, links to the repository and the video, `Start demo` that says sound will play, `Replay`), `demo/window.html`, `demo/popup.html`, `src/demo/page.ts`, `window-entry.ts`, `popup-entry.ts`, `src/demo/styles/demo.css`.
  - `demo-markup.test.ts`: the two frame pages keep the app's body markup.
  - _Requirements: 1.1–1.4, 1.6_

- [x] 5. Demo build
  - `vite.demo.config.ts`; scripts `demo` and `build:demo`; `npm run build` and `npm run app` unchanged.
  - `demo-build.test.ts` (runs on `dist/demo` when present, and in the workflow after `build:demo`): no `node:` import, no `EventSource`, no request to another origin, every font URL resolves.
  - Builder check, announced first: `npm run demo` once in the builder's browser for about 90 s (the ding plays): the scenario's 60 s, a pop-up's ×, Later and Go there, the Skin switch, then the dev server stopped and confirmed gone.
  - _Requirements: 1.6, 5.1–5.3_
  - Result (2026-11-16): two headless runs first (muted, no window; `scripts/demo-shot.mjs`): the first showed the pop-up covering the window's TIP banner and status bar, and a favicon 404; the pop-ups now stand in a column beside the window and the pages have an empty icon. The dev server could not load `../src/demo/*.ts` (it asked for `/src/…` outside `root`); an alias maps it, the build is unchanged. Builder check: `npm run demo` on `127.0.0.1:5180`, started 13:41 local time; the builder confirmed the scenario, the pop-up buttons, the skin switch and Replay. The server was meant to stop by itself after 300 s (`timeout 300 npx vite`), but it was still running at 13:53; it was stopped by hand and port 5180 confirmed free. Later checks use a watchdog that kills the process group instead.

- [x] 6. Screenshot
  - One headless run, announced first: `vite preview` of `dist/demo` on `127.0.0.1`, a headless Chromium (ask first if it needs a download), `Start demo`, wait to t = 16 s, save `docs/demo.png`, close the browser and the server, confirm both are gone.
  - _Requirements: 7.1; decision Q5_
  - Result (2026-11-16): `docs/demo.png` (2200 × 1400, 2× scale) at t = 16 s: the needs-OK pop-up, the alert strip, Kiro at 2/8, Codex idle. Headless and muted, run once; no script error; the preview server, Chrome and its temporary profile were gone afterwards.

- [ ] 7. Workflow and publishing
  - [x] 7.1 `.github/workflows/pages.yml` as in the design; `scripts/check-public.sh` (reads the user name and token shape at run time, holds nothing private) and a step that runs it.
  - [x] 7.2 Run `check-public.sh` locally and show the result. `.gitignore` does not list `.kiro`.
  - [x] 7.3 With the builder's OK: create `jasonethicseo/agentbuddy` (public), add the remote, push `master`. No force push.
  - [x] 7.4 With the builder's OK: Pages source = GitHub Actions; watch the first run; if a test needs macOS, move the job to `macos-latest` (never skip the test); open the Pages URL once headless and confirm the page, fonts and `Start demo` load.
  - [ ] 7.5 With the builder's OK: About = description, the demo URL, topics; confirm the MIT license shows.
  - _Requirements: 5.4, 5.5, 6.1–6.4_
  - Result 7.1–7.2 (2026-11-16): `check-public.sh` scans tracked files and the whole history for user folders other than `/Users/dev`, the local user name and the relay token; tracked files for full UUIDs outside Kiro's own spec files (`tasks.meta.json`, `.config.kiro`, which hold Kiro's spec and execution IDs); and every author and committer e-mail. Locally: clean. A planted line with another user folder and a UUID was caught (then removed). `gh` is installed and logged in as `jasonethicseo`; the repository does not exist yet.
  - Result 7.3 (2026-11-16): the first `check-public.sh` run before the push failed on this file's own note, which spelled out the planted path; with the builder's OK the unpushed last commit was amended (`2273f63` → `4725b82`), the check passed, then `gh repo create jasonethicseo/agentbuddy --public` and `git push -u origin master`. Only `refs/heads/master` is on GitHub (a local `refs/codex/…` ref from a Codex session was not pushed); local and remote `master` were equal. Before the push the builder asked for a sensitive-data review: tracked files and the whole history held no key or token pattern, no relay token, user name or host name, no other project's name or path from the builder's logs, only noreply author e-mails, only the Galmuri author's public e-mail, and only `127.0.0.1` / `0.0.0.0`.
  - Result 7.4 (2026-11-16): the first run passed every step on `ubuntu-latest` (so no test needs macOS) and failed only at `configure-pages`, as Pages was off. With the builder's OK: Pages source = GitHub Actions, rerun: build and deploy succeeded; `https://jasonethicseo.github.io/agentbuddy/` answers 200. One headless run of the live URL (muted): `demo replay`, the needs-OK pop-up at t = 16 s, Galmuri loaded, no script error. The check tool printed its report but then waited for Chrome to exit; Chrome and the tool were stopped by hand and confirmed gone, and the tool now sends SIGKILL to a child still running 3 s after SIGTERM. GitHub detected the MIT license.

- [x] 8. README for judges
  - The top: one line, demo link, video link (placeholder until the builder has it), `docs/demo.png`; a "Try the demo" section and what needs the real setup; the known limits, stored files and third-party libraries updated (Vite also builds the demo; the workflow's actions).
  - _Requirements: 7.1–7.3_

- [x] 9. Submission texts
  - `docs/submission/description.md`, `kiro.md` (every claim with a file or commit), `video.md` (shot list under three minutes: the real app with three real agents on the builder's Mac, then the demo URL). No private paths, names or prompts.
  - _Requirements: 8.1–8.4_

- [x] 10. Documents, final checks and handoff
  - tech.md (Demo build, Commands, Pieces 4), structure.md (`demo/`, `src/demo/`, the import rule for `src/demo`: core, ui entries, and the plain app modules the controller needs; no Electron, no Node built-ins), product.md (core flow step 7).
  - All tests pass; `npm run typecheck`, `npm run build`, `npm run build:demo` succeed; changed files under about 200 lines; `check-public.sh` passes; the pushed `master` equals the local one.
  - A short handoff at the end of this file: the demo URL, what the builder does next (video, Devpost form, social post if wanted), open items (session jumps, the probe removal if still pending).
  - _Requirements: 9.1–9.3_

## Handoff (2026-11-16)
State: tasks 1–9 and 10 are done; 7.5 waits for the builder's OK. The repository https://github.com/jasonethicseo/agentbuddy is public (MIT detected) and the demo is live at https://jasonethicseo.github.io/agentbuddy/ (deployed from `4725b82`; README, texts and steering commits after it are local until pushed). 871 tests pass locally and on `ubuntu-latest`; `typecheck`, `build`, `build:demo` and `check-public.sh` pass. No dev server, preview, headless Chrome or test process is running.
Next for the builder: record the video from `docs/submission/video.md`, upload it to YouTube as Public, and give Kiro the link (README `Video: coming soon`, `VIDEO_URL` in `src/demo/page.ts`); fill in the Devpost form from `docs/submission/description.md` and `kiro.md` (category Frankenstein; deadline 2026-12-04 14:00 PT); a #KiroweenHackathon26 post is optional (Social Blitz).
Open: 7.5 (About: the demo URL as the website, topics); jumping to a specific Claude app or Codex app session (after the submission, if time allows; `claude://code/continue?session=local_<id>` via the app's session files, `codex://threads/<thread-id>`); the Claude app's skip on a question is not observed (events.md).
