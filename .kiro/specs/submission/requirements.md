# Requirements: Demo and submission

## Introduction

This spec gets AgentBuddy submitted to Kiroween 2026 (Devpost, category **Frankenstein**, deadline 2026-12-04 14:00 PT). The rules (kiroween.devpost.com/rules, read 2026-11-16) ask for: a URL to a functional application, a public GitHub repository with an open source license shown in its About section and the `/.kiro` folder at its root, a text description, a write-up on how Kiro was used, and a public YouTube video under three minutes that shows the project working on its device.

AgentBuddy itself runs on the builder's Mac (hooks, relay, desktop app). A judge cannot install three agents, so the functional URL is a **demo**: the desktop app's main window, running in a browser on GitHub Pages, fed by a replay of a sanitized event file instead of the relay. product.md "Demo success criteria" and tech.md "Demo build" describe it; this spec builds it, publishes the repository, and prepares the submission texts. The builder records the video and fills in the Devpost form.

It builds on the finished specs `core-pipeline`, `messenger-app` ("MA"), `themes` and `retro-skin` ("RS") and the bug fixes after them (MA BF1–BF5, RS F1–F3). Their files are not edited, except their steering and README lines named in Requirement 9. Behavior nobody has observed is marked **UNVERIFIED** and is never guessed.

**Principle: the demo shows only what the product really does.** Every event in the replay is one the hooks really send (events.md mapping table), every state comes from the same core functions, and every ping, pop-up, inbox entry and count comes from the same controller logic as the desktop app. What a browser cannot do (bring another app forward, post a macOS notification, stay on top) is said in plain words instead of faked.

## Scope

### In scope
- The demo page: the main window and its pop-ups in a browser, driven by a replay of `demo/events.json`.
- The scripted, sanitized event file and a test that the scenario meets product.md's demo criteria.
- `npm run demo` (dev server) and a static build for GitHub Pages, deployed by a GitHub Actions workflow.
- Publishing the repository on GitHub after a privacy check, with the builder's OK at each irreversible step.
- README updates for judges, and the submission texts in `docs/submission/`: the Devpost description, the "How Kiro was used" write-up, and a shot list for the video.

### Out of scope
- Recording, editing or uploading the video, posting on social media, and filling in the Devpost form (the builder does these).
- Jumping to a specific Claude or Codex session (discussed 2026-11-16; after the submission, if time allows).
- A packaged or signed `.app` (MA task 14), Windows or Linux support, the setup command (`src/setup`).
- Any change to what the hooks send, the relay, or the desktop app's behavior.

### Given by the builder (2026-11-16)
- The submission work is done with Kiro (this spec), not handed to another agent.
- Submission first; session jumps only if time is left.

## Glossary
- **Demo page**: the static page on GitHub Pages that shows the demo.
- **Scenario**: the ordered events in `demo/events.json`, each with an offset in seconds from the start.
- **Replay clock**: the time the demo page passes to the core and controller: the browser's own clock. Each scenario event gets `at` = the moment the judge pressed `Start demo` + its offset.
- **Demo window**: the main window UI (title bar, toolbar, me row, alert strip, screens, TIP banner, status bar) rendered on the demo page.

---

## Requirement 1: Demo page
**User story:** As a judge, I want to open one URL and see AgentBuddy working, without installing anything.

### Acceptance criteria
1. THE demo page SHALL show the demo window at its real size (320 px wide), in the default skin, with the toolbar, Buddies, Inbox, Settings, Skin, the me row and the TIP banner working as in the desktop app.
2. THE demo page SHALL show, next to the window, a short heading and at most three lines that say what AgentBuddy is, that this is a replay of sample events in the format the real hooks send, and that the real app runs on macOS from the repository (with a link to it).
3. BEFORE the scenario starts, THE demo page SHALL show one `Start demo` button that says sound will play. Its click SHALL unlock Web Audio and start the replay (browsers allow sound only after a user gesture).
4. THE demo page SHALL make no network request except for its own static files, and SHALL use no relay, `EventSource`, cookies or storage that outlives the tab.
5. THE status bar SHALL show `demo replay` where the app shows the relay connection, and Settings › Connections SHALL say the demo uses no relay.
6. THE demo page SHALL work in current Chrome, Safari and Firefox on a desktop screen; on a narrow screen the window MAY stack above the text.

## Requirement 2: Replay
**User story:** As a judge, I want the buddies to change state on their own, like a real session.

### Acceptance criteria
1. ON start, THE demo page SHALL feed each scenario event, at its offset, through the same core functions as the relay (`validateEvent`, `applyEvent`, views), with the replay clock as `now`.
2. Pings, pop-ups, the ding, the inbox and its count on the toolbar, acknowledgements, hidden sessions and the alert strip SHALL come from the desktop app's controller logic, not a copy of it. The menu bar icon does not exist in a browser and SHALL not be imitated.
3. THE replay clock SHALL be real time, and each event's `at` SHALL be the start moment plus its offset (events with a negative offset happened before the start and form the first, baseline list, which never pings, MA 8.2), so relative times (`2m`) and the 10- and 30-minute rules behave as in the app.
4. AT the end of the scenario, THE demo page SHALL show a `Replay` button; it SHALL start the scenario again from an empty list. The scenario SHALL NOT restart by itself.
5. THE same scenario SHALL always give the same sequence of states and pings (deterministic for a fixed clock).

## Requirement 3: Scenario
**User story:** As a judge, I want to see within a minute what each agent reports.

### Acceptance criteria
1. WITHIN 60 seconds of `Start demo`, THE scenario SHALL show (product.md criteria): three buddies (Kiro, Claude Code, Codex) changing state; a Kiro progress bar moving (`task n/m` going up at least twice); a Claude approval ping with the ding and a pop-up; that Claude session working again after the approval (MA BF5) and then finishing with a second ping; and a Codex finished turn.
2. THE scenario SHALL use only mappings marked observed in events.md; Kiro SHALL never wait for approval, and Codex SHALL only finish turns.
3. EVERY event SHALL pass `validateEvent`. Paths SHALL be under `/Users/dev/`, session IDs SHALL be short invented ones, and texts SHALL be invented sample prompts and replies, never taken from the builder's logs.
4. Kiro progress SHALL come from the scenario, not from reading a file: THE demo SHALL supply the `n/m` values a `tasks.md` would give, at the events where the relay would read it (Kiro `task_start`, `task_done`, `stop`).
5. A test SHALL replay the scenario on a fixed clock and check every criterion of 3.1 and 3.2.

## Requirement 4: Pop-ups and clicks in a browser
**User story:** As a judge, I want the ping to look and act like the real one.

### Acceptance criteria
1. A ping SHALL show the same pop-up card as the app (RS Requirement 11) inside the demo page, in a column beside the window (bottom-aligned, so it never covers the window, as the app's pop-ups sit away from it), newest on top, and SHALL close by itself after the app's time.
2. `×`, `Later`, `Go there ▶` and a click on the card SHALL do what they do in the app (close and mark read, close only, go there).
3. "Go there" and a click on a buddy, session or inbox entry SHALL show a notice that says which app the real AgentBuddy would bring forward (for example `In the app, this brings Claude forward.`), because a web page cannot.
4. THE title bar buttons that act on the native window (pin, minimize, close) and the setting `macOS notification too` SHALL show a notice that says they work in the desktop app.
5. Settings, the skin, the me row status message and closed groups SHALL work for the tab's lifetime only and SHALL not be stored.

## Requirement 5: Build and deploy
**User story:** As the builder, I want the demo to update itself from the repository.

### Acceptance criteria
1. `npm run demo` SHALL start the demo page on a local dev server (`127.0.0.1`).
2. `npm run build:demo` SHALL write a static site to `dist/demo/` with relative or configured asset paths, so it works under `https://<user>.github.io/<repo>/`; the Galmuri and Nanum Gothic fonts and their licenses SHALL load there.
3. `npm run build` and `npm run app` SHALL be unchanged by this spec.
4. A GitHub Actions workflow SHALL, on a push to the default branch, run `npm ci`, `npm test`, `npm run typecheck` and `npm run build:demo`, and deploy `dist/demo/` to GitHub Pages; a failing step SHALL stop the deploy.
5. THE workflow SHALL use only GitHub's own actions (`actions/*`), pinned to a major version, with the least permissions Pages needs.

## Requirement 6: Publishing the repository
**User story:** As the builder, I want the repository public without leaking anything from my machine.

### Acceptance criteria
1. BEFORE the first push, a check SHALL run over every tracked file and every commit: no `/Users/` path other than `/Users/dev/`, no user name, no token, no real session ID outside Kiro's own `.kiro` files (structure.md), and every author e-mail a GitHub `noreply` address.
2. THE repository SHALL keep `/.kiro` (specs, hooks, steering) and SHALL NOT list `.kiro` or any of its subfolders in `.gitignore`.
3. Creating the GitHub repository, making it public, the first push, and turning on Pages SHALL each wait for the builder's OK. No force push and no history rewrite.
4. THE repository's About section SHALL show the MIT license (detected from `LICENSE`), a one-line description and the demo URL.

## Requirement 7: README for judges
**User story:** As a judge, I want to understand and try the project from its README.

### Acceptance criteria
1. THE README SHALL start with the one-line description, the demo link, the video link (filled in by the builder), and one screenshot or GIF of the demo window.
2. IT SHALL say what the demo is (a replay of sample events) and what needs the real setup (hooks, relay, macOS app), with the install steps that exist today.
3. IT SHALL keep the "Known limits", "What is stored" and "Third-party libraries" sections, updated for the demo build.

## Requirement 8: Submission texts
**User story:** As the builder, I want ready texts so I only have to paste them and record the video.

### Acceptance criteria
1. `docs/submission/description.md` SHALL hold the Devpost text description: the problem, what AgentBuddy does, the Frankenstein stitch (2000s messenger + Kiro hooks + Claude Code hooks + Codex `notify`), how to try it, and its limits.
2. `docs/submission/kiro.md` SHALL hold the "How Kiro was used" write-up, built only from this repository's records: the specs and how they were structured, the steering files, the agent hooks (including AgentBuddy reporting the Kiro session that builds it), property-based testing with examples of bugs it caught, MCP and any other Kiro feature actually used. Every claim SHALL point to a file or commit.
3. `docs/submission/video.md` SHALL hold a shot list under three minutes that shows the real app on the builder's Mac with three real agents (product.md), plus the demo URL, with no third-party trademarks or music beyond what the rules allow.
4. THE texts SHALL contain no private paths, names or prompts.

## Requirement 9: Documents and checks
### Acceptance criteria
1. tech.md, structure.md and product.md SHALL be updated for the demo build (`src/demo/` or wherever the design puts it, `npm run demo`, `build:demo`, the workflow).
2. All tests SHALL pass, and `npm run typecheck`, `npm run build` and `npm run build:demo` SHALL succeed. Every changed source file SHALL stay under about 200 lines.
3. Any check that opens a browser window SHALL be announced first, run once, and be confirmed closed afterwards (tech.md).

## Decisions (builder, 2026-11-16)
| # | Question | Decision |
|---|---|---|
| Q1 | GitHub owner and repository name | `jasonethicseo/agentbuddy`, public |
| Q2 | Scenario length and end | About 60 s, then a `Replay` button; no automatic loop, so the ding does not repeat on its own |
| Q3 | What the page shows besides the window | A heading, three short lines and links (repository, video); no other decoration |
| Q4 | Start skin | Blue Bot (the default); the Skin button switches as in the app |
| Q5 | Screenshot in the README | Taken by Kiro with a headless browser run, announced first (Requirement 9.3) |
