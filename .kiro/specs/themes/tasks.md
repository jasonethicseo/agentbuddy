# Implementation Plan: Themes

How to work through this list:
- One top-level task at a time. When it is done, run `npm test` and `npm run typecheck`, make one commit for that task, then stop and report to the builder in Korean: what changed, test results, anything left open.
- Task 6 is split by screen: each of its sub-tasks passes `npm test` and `npm run typecheck` and gets its own commit (builder, 2026-11-13). Until 6.6, `tokens.css` stays loaded next to `themes.css`, so screens not yet rewritten keep working.
- This spec changes the look, not the behavior. The only behavior changes are T9, T10 and T14 of the requirements. If a step seems to need any other behavior change, stop and ask.
- Stage files by name. Never commit real home paths, user names, session IDs, tokens or prompts; fixtures use `/Users/dev/...` and shortened IDs.
- Ask the builder before every download (Jua). Before changing any file outside this repository: back it up, show the diff, wait for approval.
- Never change what the user sees without warning (tech.md). A check that opens a window or plays a sound is announced first with what will happen and for how long, runs once, ends by itself, and is stopped and confirmed stopped before the tool call returns. `npm test` never opens a window.
- The builder's relay (`agentbuddy`) stays running while working.
- Optional tasks are marked `- [ ]*`.

- [ ] 1. O5: transparent main window check
  - [ ] 1.1 Write the throwaway check app in `scripts/o5/` (not part of the product), as in design "O5": one transparent, frameless, resizable 320 × 620 window (min height 420) with a 16 px-radius frame and a draggable title bar; it logs every `resize` and `move` with bounds, and `isResizable()`, to a mode-600 file in the system temp folder, and exits by itself at 30 s.
  - [ ] 1.2 Announce "지금 띄웁니다, 30초", run it once in the background and wait for its exit in the same tool call; confirm with `pgrep` that no Electron process of this repository is left (kill it if one is); read the log. The builder tries the bottom edge, the top edge and the title bar, and looks at the corners and the shadow.
  - [ ] 1.3 Record the outcome (date, Electron and macOS versions, the events, the builder's answers) in the requirements (new "Observations" section and the outcome of Req 8.3/8.4), and set `MAIN_FRAME` in the design to `transparent` or `opaque`. Delete `scripts/o5/` and the log.
  - _Requirements: 8.1, 8.2, 8.5_

- [ ] 2. Jua
  - [ ] 2.1 With the builder's OK, download `Jua-Regular.ttf` and `OFL.txt` (saved as `OFL-Jua.txt`) from `google/fonts` `ofl/jua/` into `src/ui/public/fonts/`. Check `METADATA.pb` says `license: "OFL"` and the license text reads `SIL OPEN FONT LICENSE Version 1.1`; record the SHA-256 of both here.
  - [ ] 2.2 Read Jua's `cmap` for `▸ ♡ ♥ ♪ ▶ ┗ ▼ ✓ ✎ ★ N`. For each character Jua lacks, make only that character render in Nanum Gothic: a `unicode-range` on Jua's `@font-face` that leaves those code points out (or, if that is not possible, the font-family order), so Jua is never replaced by the system font for them. Record which characters fall back, and how, in the design ("Fonts") and in `fonts.css`'s comment.
  - [ ] 2.3 `fonts.css`: Jua's `@font-face`, `--font-title: Jua, 'Nanum Gothic', sans-serif`; remove Silkscreen's rule, `Silkscreen-Regular.ttf` and `OFL-Silkscreen.txt`; update `ui-build.test.ts` (Jua and its license byte for byte, no Silkscreen file); README font table
  - _Requirements: 5, 12.3, 12.5_

- [ ] 3. Core: theme and phrase strings
  - [ ] 3.1 `src/core/theme.ts` (`THEMES`, `ThemeId`, `DEFAULT_THEME`, `THEME_NAMES`, `isTheme`, `parseTheme`); `PublicSettings.theme`
    - _Requirements: 1.2, 1.3_
  - [ ] 3.2 `text.ts`: `working…` and `studying hard` (T14), `StatusParts.lead`; update `status-line.test.ts`, `text.prop.test.ts` (P21) and `ui-model.test.ts` to the new strings and `lead`
    - _Requirements: 4.2, 4.5_
  - [ ] 3.3 Tests: `parseTheme` unit cases; `tests/property/theme.prop.test.ts` (any JSON value and any string give one of `THEMES`; identity on `THEMES`); no `pingRecord` or `serializeSettings` output holds a value of `PHRASES` or `SPEC_TASK_PHRASE`
    - _Requirements: 4.6, 11.1, 11.2_

- [ ] 4. App: the setting, IPC and theme delivery
  - [ ] 4.1 `settings.ts`: `theme` (default, `parseTheme`, serialized); old files load unchanged; the settings round-trip property includes `theme`
    - _Requirements: 1.1–1.4, 1.6_
  - [ ] 4.2 `ipc.ts`: `ui:theme` with its check, `popup:theme`; `preload-main.ts` `setTheme`, `preload-popup.ts` `onTheme`; validator unit tests
    - _Requirements: 1.5; MA 15.2_
  - [ ] 4.3 `controller.ts`: `onTheme`, `Ports.applyTheme`; unit test (saves, pushes state, calls `applyTheme`, nothing else; the same theme does nothing); add `applyTheme` to the existing fake ports, with no other change to those tests
    - _Requirements: 2.6_
  - [ ] 4.4 `config.ts` (`MAIN_FRAME` from task 1, `POPUP.height` 144), `window-options.ts` (transparent or opaque options, `THEME_BACKGROUND`), `windows.ts` and `popups.ts` (`?theme=` and `&frame=` in the URL, `popups.setTheme` storing and broadcasting), `main.ts` wiring (`setBackgroundColor` when opaque); window-option unit tests
    - _Requirements: 2.5, 2.7, 3.6, 8.3, 8.4, 8.6_

- [ ] 5. Theme tokens and sprites
  - [ ] 5.1 `styles/themes.css` with both blocks from the design's token table, `[data-theme-preview]`, `[data-frame="opaque"]` and the hidden-until-themed rule. `tokens.css` stays until task 6, as the only allowed exception of the color rule.
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 8.4_
  - [ ] 5.2 `src/ui/theme.ts`: apply the theme and the frame from the page query on load, and from each snapshot; `bridge.ts` gives `blue-bot` in the browser
    - _Requirements: 2.4, 2.7, 2.8_
  - [ ] 5.3 `sprites/types.ts`, `sprites/blue-bot.ts`, `sprites/strawberry-milk.ts` (rectangles copied from `FacesBot`, `FacesCute`, `MainBot`, `MainCute`, roles only), `sprites/render.ts`, `styles/sprites.css` (role fills, agent bodies, badges)
    - _Requirements: 6.1–6.9, 12.1_
  - [ ] 5.4 Tests: `themes.test.ts` (same names in both blocks; the color rule over CSS, TS and HTML; `THEME_BACKGROUND` equals `--bg`); `sprites.test.ts` (export shape, grid bounds, a `--px-*` token for every role, grey roles only in `OFFLINE`/`ENDED`, badges exactly on state sprites of 26 px or more that are not `OFFLINE`, rectangles equal to the mockups read in the test); the token-set property in `theme.prop.test.ts`
    - _Requirements: 3.2, 3.3, 6, 11.1, 11.2_

- [ ] 6. Screens in both themes (one commit per sub-task)
  - [ ] 6.1 Progress cells model and the main window skeleton: `model/list.ts` progress `cells` (`m` cells, `n` done, one current while `WORKING` and `n < m`, none above 30 or for `m = 0`) and `lead` on buddy and session view models, with unit tests; `main.css` rewritten for the window, title bar, alert strip, tabs and footer from `MainBot`/`MainCute` with tokens only; `index.html` and `chrome.ts` (title sprite, `.title-mark`, `.alert-mark`, `.relay-mark`)
    - _Requirements: 4.1, 5.9 of MA, 7.1, 7.3_
  - [ ] 6.2 Buddy list and the `me` row: `screens/list.ts` (26 px and 16 px sprites, `.lead-work`, `.unread-mark`, `┗`, the urgent-row rule of D12, progress cells and bar) and its rules in `main.css`; `screens/me.ts` (the 34 px `me` sprite, the row as a card)
    - _Requirements: 4, 6.4, 6.5, 7.1–7.3_
  - [ ] 6.3 Inbox: `screens/inbox.ts` (26 px sprites with badges, `.unread-mark`, the unread tints) and its rules in `main.css`
    - _Requirements: 7.7_
  - [ ] 6.4 Settings: `model/theme.ts` (`themeTiles`) with unit tests; `screens/settings.ts` with the Theme card first (native radios, previews through `data-theme-preview`, the note, `setTheme`), card titles, `accent-color`, connection marks; its rules in `main.css`
    - _Requirements: 2.1–2.4, 7.7_
  - [ ] 6.5 Pop-up: `popup.html`, `popup.css`, `screens/popup.ts`: the `<h1>` title with its `aria-label`, × named `Close and mark as read`, `.go-mark`, colors by kind and theme, both kinds with all three buttons and MA 9.5's click handling unchanged; `onTheme` fills the card again with the last content
    - _Requirements: 2.5, 7.4–7.6_
  - [ ] 6.6 Remove `tokens.css`, `icons.css`, `icons.ts`, `ui-icons.test.ts` and the color-rule exception; `contrast.test.ts` rewritten with the design's pair table in both themes and its listed exceptions
    - _Requirements: 3.3, 3.5, 9, 11.1_

- [ ] 7. Checkpoint and mutation check
  - All tests pass; `npm run build` succeeds; every changed file stays under about 200 lines; grep for color values outside `themes.css` and `src/app/window-options.ts`, for `/Users/` paths other than `/Users/dev/`, user names and token-like strings.
  - Mutation check, one at a time, each reverted with `git checkout -- <file>` before the next: (a) delete one token from the Strawberry Milk block; (b) set Blue Bot `--text-2` to `#8A9BBF`; (c) make `parseTheme` return its input when it is a string. Record which tests failed for each. If one passes unnoticed, add the missing test before going on.
  - _Requirements: 11.3, 11.4_

- [ ] 8. Visual check with the builder
  - Announced first with what appears and for how long, run once with a fixed time limit, results written to a file while it runs, nothing left running afterwards (MA working rules). With a temp HOME and port 4399 so the app starts its own relay, and fake events with `/Users/dev/...` paths and no real prompts: the three tabs in both themes next to the mockups; switching the theme while a pop-up is open (it changes, does not move, does not close); the Theme card with the keyboard (Tab, arrow keys, Space); the corners as O5 decided; the menu bar icon unchanged. Then the relay's page in a browser shows Blue Bot.
  - _Requirements: 2, 7, 8.3, 8.4, 10_

- [ ] 9. Steering, README and final checkpoint
  - structure.md (`src/core/theme.ts`, `src/ui/sprites/`, `src/ui/theme.ts`, `model/theme.ts`, `styles/themes.css` as the only file with colors, no `icons.ts`); tech.md property list (theme properties); README (the Theme setting, Jua, the corner outcome in the known limits).
  - All tests pass and `npm run build` succeeds. `.gitignore` does not list `.kiro`.
  - _Requirements: 5.4, 8.5, 11.4_
