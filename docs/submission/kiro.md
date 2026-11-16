# How Kiro was used

AgentBuddy was built in Kiro IDE between 2026-11-12 and 2026-11-16: more than 115 commits, five specs, six steering files and four agent hooks, all in this repository's `.kiro/`. Every claim below points to a file or a commit.

## Spec-driven development: five specs, each building on the last

| Spec | What it built | Tasks |
|---|---|---|
| `.kiro/specs/core-pipeline/` | event shape, per-agent normalization, state rules, hook command, relay, Kiro progress, restore | 19 top-level tasks |
| `.kiro/specs/messenger-app/` | Electron desktop app: pings, pop-ups, inbox, jump, settings, "me" row | 14 (one optional) |
| `.kiro/specs/themes/` | two skins (Blue Bot, Strawberry Milk) as token sets and sprite modules | 9 |
| `.kiro/specs/retro-skin/` | the 2000s materials: gloss, raised, sunken, pixel fonts, toolbar, TIP banner | 9 |
| `.kiro/specs/submission/` | the web demo, the Pages workflow, publishing, these texts | 10 |

How the specs were structured, and what that changed compared with vibe coding:
- **Requirements first, in EARS form ("WHEN … THE … SHALL …"),** with an explicit out-of-scope list and a "Given by the builder" list, so scope creep had to be written down to happen.
- **Later specs never edit earlier ones.** Each one opens with a "Changes to earlier criteria" table: which criterion, what it was, what it becomes, and why. See `retro-skin/requirements.md`, C1–C13.
- **UNVERIFIED is a word in the specs.** Behavior nobody had observed is marked and never guessed. Example: the Kiro task-run hooks' launcher fields stay "unverified" in `events.md`, so the demo scenario gives those events no bundle ID.
- **Tasks end with a recorded result, and the later specs end with a handoff.** The next session starts from the handoff instead of re-reading the code (`messenger-app/tasks.md` "Handoff for the next session"; `retro-skin/tasks.md` "Handoff").
- **Bug fixes found in real use get a row,** not a silent patch: `messenger-app/requirements.md` BF1–BF5 and `retro-skin/requirements.md` F1–F3, each with what was found, why, and what changed.

## Steering: the contract, not just style

`.kiro/steering/`:
- `product.md`: the one-line idea, principles ("show only what the agent actually tells us", "never block an agent", "local only") and the demo success criteria. These criteria are now an automated test (`tests/unit/demo-criteria.test.ts`).
- `tech.md`: hard limits that every spec inherits (hook exits 0 within 900 ms, `127.0.0.1` only, a pure core with time passed in) and the list of required property tests.
- `structure.md`: where code goes and the import rules (core imports no Node built-in; UI never imports the app).
- `events.md`: **the contract between agent hooks and AgentBuddy.** Every mapping was observed with a probe before it was written down, with sanitized raw payloads, a launcher table, and eight numbered "known traps" found in real use. Its JSON examples are test fixtures: `tests/unit/fixtures.test.ts` fails if a fixture marked verbatim differs from events.md by one character.
- `design.md`: the visual source of truth (tokens, materials, sprites, contrast rules), above the mockups.
- `00-language.md`: an always-included rule: answers to the builder in Korean, while code, specs and commits stay in English.

What helped most: putting **observations** in steering, not only preferences. When the Claude app's `Stop` arrived with a subfolder as `cwd`, the fix started as a new paragraph in events.md, then became task 15 and property P14 (commits `827e5ce`, `b5e139d`).

## Agent hooks: Kiro reporting on the Kiro session that builds it

`.kiro/hooks/agentbuddy-prompt-submit.json`, `-pre-task.json`, `-post-task.json` and `-stop.json` run `agentbuddy-hook kiro || true` on `UserPromptSubmit`, `PreTaskExec`, `PostTaskExec` and `Stop`. So the Kiro session building AgentBuddy shows up as the buddy `Kiro @ agentbuddy`, with its spec progress read from the `tasks.md` it is working on:
- Progress was confirmed on screen as the core-pipeline spec moved from task 14/19 to 15/19 on a task run's `PostTaskExec` (commit `e6ff1e1`, `core-pipeline/tasks.md` task 16.5).
- The hooks taught us how Kiro behaves (events.md traps 4–6): `PostTaskExec` fires only through the task runner, Kiro's `Stop` has no text, and every task run gets a new `session_id`. That is why progress belongs to the buddy, not to a session.
- `|| true` matters: a failing `Stop` hook would start another turn, so the command must always exit 0 (`agentbuddy-stop.json` says why).

## Property-based testing

15 property test files, 53 `fc.assert` properties (`tests/property/`), listed in tech.md "Testing expectations". What they pinned down:
- **Arrival order never matters** (state, names, launcher, kept task event): hook processes are separate and can arrive out of order. `state.prop.test.ts`.
- **A session that runs `cd` stays one buddy** (P14), and **an ended session stays ended when its earlier events arrive late** (P15). Both were written for behavior seen in real use (commits `827e5ce`, `21d2cc7`).
- **Normalization never throws and never lets hidden Codex turns through,** whichever of their two signals is present. Codex added new hidden turns twice after launch: suggestions (trap 7, `1b239db`) and a safety check (trap 8, `3d28f25`). Each got its property first.
- **Approval followed by tool runs** (MA BF5, `0c0dd52`): a property that `tool` leaves `WAITING_APPROVAL` and changes no other state, and that order still doesn't matter with the new kind.
- **The demo is deterministic** for any step timing (`demo-replay.prop.test.ts`).

We also ran **mutation checks**: break one thing on purpose, see which test fails, revert. Themes: 3 mutations, each caught by 1–6 tests (`themes/tasks.md` task 7). Retro skin: 4 mutations, each caught (`retro-skin/tasks.md` 6.3). For the new `tool` kind and the demo criteria test, we checked that the tests fail when the fix is removed. Unit tests caught bugs before commit too, for example `parseSettings` taking a saved `null` as a status message (`messenger-app/tasks.md` task 13).

## Working rules Kiro followed

These are written into the specs' task lists, and Kiro kept to them:
- Anything that changes the builder's machine goes **backup → diff → approval**: `~/.claude/settings.json`, `~/.codex/config.toml`, deleting probe data (core-pipeline task 14, 17; MA BF5).
- **Announce every check that opens a window, a browser or plays a sound;** run it once with a time limit and confirm nothing is left running. When a dev server outlived its limit, the miss was recorded (`submission/tasks.md` task 5).
- **Privacy before publishing:** `scripts/check-public.sh` scans files and the whole history. It runs in CI as well, and it stopped the first push over a note that only looked like a private path (`submission/tasks.md` 7.3).

## Kiro features used

- Kiro IDE: specs (requirements → design → tasks), steering (always-included and project files), agent hooks, task runs from `tasks.md`.
- Kiro CLI 3.2.1: used once to probe its `SessionEnd` trigger. No payload was observed, so it stays unmapped (events.md).
- MCP: no MCP server is part of AgentBuddy, and none is recorded in its specs.
