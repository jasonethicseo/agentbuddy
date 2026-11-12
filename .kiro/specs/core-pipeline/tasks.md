# Implementation Plan: Core Pipeline

How to work through this list:
- One top-level task at a time. When it is done, run `npm test` (from task 1 on), make one commit for that task, then stop and report to the builder in Korean: what changed, test results, anything left open.
- Stage files by name. Never commit real home paths, user names, session IDs or tokens.
- Ask the builder before anything that changes the machine outside this repository (for example `npm link`).
- From task 11 on, AgentBuddy watches this repository's Kiro session. Keep the relay running while working.

- [x] 1. Project setup
  - Create `package.json` (`"type": "module"`, `engines.node >= 20`, `bin` for `agentbuddy` and `agentbuddy-hook`, scripts `build`, `build:node`, `build:ui`, `relay`, `dev`, `test`).
  - Add dev dependencies only: `typescript`, `vite`, `vitest`, `fast-check`, `esbuild`, `@types/node`.
  - Add `tsconfig.json` (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), `vitest.config.ts`, and a `.gitignore` for `node_modules/` and `dist/` only (never `.kiro`).
  - Add `LICENSE` (MIT) and a short `README.md` that lists the third-party libraries.
  - First commit includes `.kiro/steering/` and this spec.
  - _Requirements: 12.7, 21.5_

- [x] 2. Core event and text
  - [x] 2.1 Create `src/core/config.ts` with the constants and `parsePort`
    - _Requirements: 13.2, 13.3, 15.1, 15.6_
  - [x] 2.2 Create `src/core/event.ts`: types, `KIND_ORDER`, `validateEvent`
    - _Requirements: 1.1–1.6_
  - [x] 2.3 Create `src/core/text.ts`: `truncate`, `codePointLength`, `AGENT_NAMES`, `folderName`, `displayName`, `shortId`
    - _Requirements: 6.1–6.4, 7.3_
  - [x] 2.4 Write property test P3 (truncation) in `tests/property/text.prop.test.ts`
    - _Requirements: 6.1–6.4_
  - [x] 2.5 Write unit tests for `validateEvent`, `parsePort` and `displayName`
    - _Requirements: 1.3–1.6, 7.3_

- [ ] 3. Normalization and fixtures
  - [ ] 3.1 Create `tests/fixtures/payloads.ts` with every events.md example copied character for character, each labeled observed or derived
    - _Requirements: 21.1, 21.2, 21.5_
  - [ ] 3.2 Create `src/core/normalize.ts`: `normalize` and one function per agent, including both Codex title signals
    - _Requirements: 2.1–2.8, 3.1–3.7, 4.1–4.7, 5.1–5.7_
  - [ ] 3.3 Write `tests/unit/mapping.test.ts`: one test per events.md mapping row (12)
    - _Requirements: 21.3_
  - [ ] 3.4 Write property tests P1 (normalize never throws, output valid) and P2 (Codex title turns dropped)
    - _Requirements: 4.2–4.4, 5.1–5.3_

- [ ] 4. Buddy history and state
  - [ ] 4.1 Create `src/core/history.ts`: `stamp`, `compareStamped`, `buddyKey`, `insertEvent`, `isTaskEvent`, `laterTask`
    - _Requirements: 7.1, 7.2, 8.1–8.4, 8.6_
  - [ ] 4.2 Create `src/core/state.ts`: `nextState`, `foldBuddy`, `applyEvent`, `displayState`, `toView`, `toViews`
    - _Requirements: 7.4, 9.1–9.11, 10.1–10.6_
  - [ ] 4.3 Write property tests P4 (arrival order), P5, P6 (state entry and exit), P7 (window), P9 (Codex states), P10 (latest task event)
    - _Requirements: 8.5, 8.7, 9.7, 9.8, 10.8_
  - [ ] 4.4 Write `tests/unit/state.test.ts`: Kiro `stop` keeps the prompt text, a late `prompt` lands in its place, Claude `permission` then `idle`, a spec path kept after 60 chat events, thresholds at exactly 10 and 30 minutes
    - _Requirements: 8.2, 9.8, 9.9, 9.10, 10.3–10.5_

- [ ] 5. Checkpoint: core
  - All tests pass. `src/core` imports nothing outside `src/core` and no `node:` modules (check with a grep).
  - Every file stays under about 200 lines.

- [ ] 6. Hook command
  - [ ] 6.1 Create `src/hook/cli.ts`: stamp `at`, hard-exit timer at 900 ms from process start, argv for Codex, stdin up to 500 ms for Kiro and Claude, token read, POST with 300 ms abort, fixed-code error log, no stdout or stderr
    - _Requirements: 12.1–12.7, 13.1–13.7, 14.1–14.3_
  - [ ] 6.2 Add `build:node` (esbuild) for `dist/hook.js` with a shebang
    - _Requirements: 12.7_
  - [ ] 6.3 Write `tests/unit/hook.test.ts`: spawn `dist/hook.js` with a temp `HOME`; exit 0 with empty stdout and stderr within 1000 ms when the relay is down, when a fake relay never answers, and when stdin stays open; Codex never waits for stdin; the error log holds codes only
    - _Requirements: 12.3, 13.1–13.7_

- [ ] 7. Relay: intake and stream
  - [ ] 7.1 Create `src/relay/home.ts`: home folder (mode 700), token create or load (mode 600), daily log names
    - _Requirements: 15.2, 16.2_
  - [ ] 7.2 Create `src/relay/store.ts` with `accept`, `views` and ordered daily log appends (mode 600). Restore comes in task 14.
    - _Requirements: 16.2–16.5_
  - [ ] 7.3 Create `src/relay/stream.ts`: SSE, full list on connect and on change, heartbeat every 25 s
    - _Requirements: 18.1–18.4_
  - [ ] 7.4 Create `src/relay/server.ts`: Host, Origin, token (constant-time), size and body checks in the design order; static UI files with the security headers; no CORS headers
    - _Requirements: 15.1, 15.3–15.8, 16.1, 18.5_
  - [ ] 7.5 Create `src/relay/main.ts`: port, token, listen on `127.0.0.1`, `broadcastIfChanged`, 30-second tick, port-in-use message; add it to `build:node`
    - _Requirements: 10.7, 15.1, 15.2_
  - [ ] 7.6 Write `tests/unit/relay.test.ts` for the server status codes (403, 403, 401, 413, 400, 204), file modes, and one SSE message after an accepted event
    - _Requirements: 15.3–15.6, 16.1–16.4, 18.2, 18.3_

- [ ] 8. Minimal text-only UI
  - [ ] 8.1 Create `index.html`, `src/ui/main.ts` and `src/ui/screens/list.ts`: table built with `textContent` only, `?` for `STALE`, Kiro and Codex progress cells, `relay disconnected` notice
    - _Requirements: 20.1–20.7_
  - [ ] 8.2 Add `vite.config.ts` with output `dist/ui` and the dev proxy for `/stream` (`changeOrigin: true`)
    - _Requirements: 18.5_

- [ ] 9. Checkpoint: first end-to-end run
  - `npm run build`, start the relay, and pipe each observed fixture through `dist/hook.js` (stdin for Kiro and Claude, last argv for Codex).
  - Confirm in the browser that Kiro, Claude Code and Codex buddies appear and change state, and that the Codex title turn adds nothing.
  - Confirm `~/.agentbuddy/hook-errors.log` gets no new lines while the relay is up.

- [ ] 10. Connect this repository's Kiro hooks to AgentBuddy
  - With the builder's OK, run `npm link` so `agentbuddy-hook` is on `PATH`.
  - Add hook files under `.kiro/hooks/` for `UserPromptSubmit`, `PreTaskExec`, `PostTaskExec` and `Stop`, each running `agentbuddy-hook kiro`. Use the hook file format the builder's probe used with this Kiro version.
  - The hook files contain no absolute paths, user names or tokens. Check with a grep before committing.
  - Confirm with the builder that a chat prompt shows `Kiro @ agentbuddy` as `WORKING` and then `TURN_DONE`, and that the hook error log stays empty.
  - _Requirements: 7.1, 12.1, 13.1_

- [ ] 11. Confirm tasks.md markers during a task run (run this task with the task's run button)
  - At the start of this task, while Kiro is running it, record the exact top-level lines of this `tasks.md` (`grep -n '^- \[' .kiro/specs/core-pipeline/tasks.md`) and note which marker the running task has.
  - At the start of task 12, record again how task 11 was marked after it finished.
  - Write the observed markers, with the date and Kiro version, into the progress line of `.kiro/steering/tech.md` and into Requirement 11.8.
  - If a marker does not fit the rule (one character between the brackets, done only for `x` / `X`), stop and propose a rule change to the builder before task 12.
  - _Requirements: 11.2–11.4, 11.8_

- [ ] 12. Kiro progress
  - [ ] 12.1 Create `src/core/progress.ts`: `parseProgress` and `isAllowedSpecPath`, following the rule confirmed in task 11
    - _Requirements: 11.1–11.7, 19.2_
  - [ ] 12.2 Write property test P8 and `tests/unit/progress.test.ts` with marker cases (including those seen in task 11) and path cases (inside, sibling prefix, outside, wrong tail, nested)
    - _Requirements: 11.2–11.7, 19.2_
  - [ ] 12.3 Create `src/relay/tasks.ts` and wire it in `main.ts`: read on Kiro `task_start`, `task_done` and `stop` when the buddy has a spec path, real paths inside the real `cwd`, regular file of at most 1 MB, newest read wins
    - _Requirements: 19.1–19.6_
  - [ ] 12.4 Add relay tests: a symlinked `tasks.md` pointing outside `cwd` gives progress unknown; a valid file gives `task n/m`
    - _Requirements: 19.2–19.4_
  - [ ] 12.5 Confirm with the builder that `Kiro @ agentbuddy` shows this spec's `task n/m`, and that it moves when this task is marked done

- [ ] 13. Checkpoint: watched work
  - All tests pass. The buddy list showed this session's tasks 11–12 with state and progress.
  - Note in the report any hook call that took longer than expected or left a line in the hook error log.

- [ ] 14. Restore on start
  - [ ] 14.1 Add `restore` to `src/relay/store.ts`: yesterday's then today's log, valid lines with `at` in the last 24 hours, same core functions, sequences in file order; then read progress for Kiro buddies with a spec path
    - _Requirements: 17.1–17.5_
  - [ ] 14.2 Add relay tests: two daily files with lines older than 24 hours, an invalid line and a cut-off last line; a missing file
    - _Requirements: 17.1–17.5_
  - [ ] 14.3 Restart the relay during this task and confirm with the builder that `Kiro @ agentbuddy` comes back with its state and progress

- [ ] 15. README and final checkpoint
  - README: what the pipeline does, `npm run build` / `npm run relay`, `npm link`, the hook command per agent, `AGENTBUDDY_PORT`, the third-party libraries, and the known limits from the design (including same-folder windows merging into one buddy).
  - All tests pass and `npm run build` succeeds.
  - Grep the repository for `/Users/` paths other than `/Users/dev/`, real session IDs and token-like strings. `.gitignore` does not list `.kiro`.
  - _Requirements: 7.5, 21.5_
