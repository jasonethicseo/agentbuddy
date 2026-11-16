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

- [ ] 3. Demo ports and host
  - [ ] 3.1 `src/demo/ports.ts`: the controller's ports for the demo, with the notice texts of the design and the app-name map; memory-only inbox and settings.
  - [ ] 3.2 `src/demo/host.ts`: start (baseline, then a 250 ms tick), main and pop-up bridges, pop-up frames closed after `POPUP_MS`, the ding in the demo page, `Replay` (fresh controller, frames reloaded), stop after the end.
  - [ ] 3.3 `demo-ports.test.ts`: each jump plan, notify, window actions and the pin give their notice; nothing is stored.
  - _Requirements: 2.2, 2.4, 4.1–4.5_

- [ ] 4. Demo pages
  - `demo/index.html` (heading, three lines, links to the repository and the video, `Start demo` that says sound will play, `Replay`), `demo/window.html`, `demo/popup.html`, `src/demo/page.ts`, `window-entry.ts`, `popup-entry.ts`, `src/demo/styles/demo.css`.
  - `demo-markup.test.ts`: the two frame pages keep the app's body markup.
  - _Requirements: 1.1–1.4, 1.6_

- [ ] 5. Demo build
  - `vite.demo.config.ts`; scripts `demo` and `build:demo`; `npm run build` and `npm run app` unchanged.
  - `demo-build.test.ts` (runs on `dist/demo` when present, and in the workflow after `build:demo`): no `node:` import, no `EventSource`, no request to another origin, every font URL resolves.
  - Builder check, announced first: `npm run demo` once in the builder's browser for about 90 s (the ding plays): the scenario's 60 s, a pop-up's ×, Later and Go there, the Skin switch, then the dev server stopped and confirmed gone.
  - _Requirements: 1.6, 5.1–5.3_

- [ ] 6. Screenshot
  - One headless run, announced first: `vite preview` of `dist/demo` on `127.0.0.1`, a headless Chromium (ask first if it needs a download), `Start demo`, wait to t = 16 s, save `docs/demo.png`, close the browser and the server, confirm both are gone.
  - _Requirements: 7.1; decision Q5_

- [ ] 7. Workflow and publishing
  - [ ] 7.1 `.github/workflows/pages.yml` as in the design; `scripts/check-public.sh` (reads the user name and token shape at run time, holds nothing private) and a step that runs it.
  - [ ] 7.2 Run `check-public.sh` locally and show the result. `.gitignore` does not list `.kiro`.
  - [ ] 7.3 With the builder's OK: create `jasonethicseo/agentbuddy` (public), add the remote, push `master`. No force push.
  - [ ] 7.4 With the builder's OK: Pages source = GitHub Actions; watch the first run; if a test needs macOS, move the job to `macos-latest` (never skip the test); open the Pages URL once headless and confirm the page, fonts and `Start demo` load.
  - [ ] 7.5 With the builder's OK: About = description, the demo URL, topics; confirm the MIT license shows.
  - _Requirements: 5.4, 5.5, 6.1–6.4_

- [ ] 8. README for judges
  - The top: one line, demo link, video link (placeholder until the builder has it), `docs/demo.png`; a "Try the demo" section and what needs the real setup; the known limits, stored files and third-party libraries updated (Vite also builds the demo; the workflow's actions).
  - _Requirements: 7.1–7.3_

- [ ] 9. Submission texts
  - `docs/submission/description.md`, `kiro.md` (every claim with a file or commit), `video.md` (shot list under three minutes: the real app with three real agents on the builder's Mac, then the demo URL). No private paths, names or prompts.
  - _Requirements: 8.1–8.4_

- [ ] 10. Documents, final checks and handoff
  - tech.md (Demo build, Commands, Pieces 4), structure.md (`demo/`, `src/demo/`, the import rule for `src/demo`: core, ui entries, and the plain app modules the controller needs; no Electron, no Node built-ins), product.md (core flow step 7).
  - All tests pass; `npm run typecheck`, `npm run build`, `npm run build:demo` succeed; changed files under about 200 lines; `check-public.sh` passes; the pushed `master` equals the local one.
  - A short handoff at the end of this file: the demo URL, what the builder does next (video, Devpost form, social post if wanted), open items (session jumps, the probe removal if still pending).
  - _Requirements: 9.1–9.3_
