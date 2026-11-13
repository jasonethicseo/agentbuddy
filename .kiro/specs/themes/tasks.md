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

- [x] 1. O5: transparent main window check
  - [x] 1.1 Write the throwaway check app in `scripts/o5/` (not part of the product), as in design "O5": one transparent, frameless, resizable 320 × 620 window (min height 420) with a 16 px-radius frame and a draggable title bar; it logs every `resize` and `move` with bounds, and `isResizable()`, to a mode-600 file in the system temp folder, and exits by itself at 30 s.
  - [x] 1.2 Announce "지금 띄웁니다, 30초", run it once in the background and wait for its exit in the same tool call; confirm with `pgrep` that no Electron process of this repository is left (kill it if one is); read the log. The builder tries the bottom edge, the top edge and the title bar, and looks at the corners and the shadow.
  - [x] 1.3 Record the outcome (date, Electron and macOS versions, the events, the builder's answers) in the requirements (new "Observations" section and the outcome of Req 8.3/8.4), and set `MAIN_FRAME` in the design to `transparent` or `opaque`. Delete `scripts/o5/` and the log.
  - _Requirements: 8.1, 8.2, 8.5_
  - Result (2026-11-13): transparent. Height resize from both edges and title bar drag worked; the builder saw round corners; the shadow and the 420 px minimum were not checked (moved to task 8). The tool call returned before the app ended (it was started with `&`); the app was stopped at about 29 s and nothing was left. Recorded in requirements O5.

- [x] 2. Jua
  - [x] 2.1 With the builder's OK, download `Jua-Regular.ttf` and `OFL.txt` (saved as `OFL-Jua.txt`) from `google/fonts` `ofl/jua/` into `src/ui/public/fonts/`. Check `METADATA.pb` says `license: "OFL"` and the license text reads `SIL OPEN FONT LICENSE Version 1.1`; record the SHA-256 of both here.
  - [x] 2.2 Read Jua's `cmap` for `▸ ♡ ♥ ♪ ▶ ┗ ▼ ✓ ✎ ★ N`. For each character Jua lacks, make only that character render in Nanum Gothic: a `unicode-range` on Jua's `@font-face` that leaves those code points out (or, if that is not possible, the font-family order), so Jua is never replaced by the system font for them. Record which characters fall back, and how, in the design ("Fonts") and in `fonts.css`'s comment.
  - [x] 2.3 `fonts.css`: Jua's `@font-face`, `--font-title: Jua, 'Nanum Gothic', sans-serif`; remove Silkscreen's rule, `Silkscreen-Regular.ttf` and `OFL-Silkscreen.txt`; update `ui-build.test.ts` (Jua and its license byte for byte, no Silkscreen file); README font table
  - _Requirements: 5, 12.3, 12.5_
  - Result (2026-11-13): downloaded with the builder's OK from `https://raw.githubusercontent.com/google/fonts/main/ofl/jua/` (2.1 MB); `METADATA.pb` (not kept) says `license: "OFL"`; `OFL-Jua.txt` reads `Copyright 2018 The Jua Project Authors` and `SIL OPEN FONT LICENSE Version 1.1`. SHA-256: `Jua-Regular.ttf` `769677ae…8279f898`, `OFL-Jua.txt` `44a7c6e4…f2773e3c`. Jua lacks `♪ ▶ ┗ ▼ ▲ ×` (Nanum Gothic draws them through the font stack) and `▸ ✓ ✎` (in neither font; the system draws them). Recorded in design "Fonts". Silkscreen and its license removed; `ui-build.test.ts` checks the exact font folder and the title stack.

- [x] 3. Core: theme and phrase strings
  - [x] 3.1 `src/core/theme.ts` (`THEMES`, `ThemeId`, `DEFAULT_THEME`, `THEME_NAMES`, `isTheme`, `parseTheme`); `PublicSettings.theme`
    - _Requirements: 1.2, 1.3_
  - [x] 3.2 `text.ts`: `working…` and `studying hard` (T14), `StatusParts.lead`; update `status-line.test.ts`, `text.prop.test.ts` (P21) and `ui-model.test.ts` to the new strings and `lead`
    - _Requirements: 4.2, 4.5_
  - [x] 3.3 Tests: `parseTheme` unit cases; `tests/property/theme.prop.test.ts` (any JSON value and any string give one of `THEMES`; identity on `THEMES`); no `pingRecord` or `serializeSettings` output holds a value of `PHRASES` or `SPEC_TASK_PHRASE`
    - _Requirements: 4.6, 11.1, 11.2_
  - Result (2026-11-13): 516 tests pass. `PublicSettings.theme` moved to 4.1, where the settings file starts to carry it, so this task leaves the app files untouched. So that the list keeps showing `♪ working…` until task 6, `lead` already reaches the buddy and session view models and `screens/list.ts` draws it as an empty `.lead-work` span whose `::before` reads `--glyph-work` (`"♪"` in `tokens.css` for now; `themes.css` takes it over in task 5). New tests: `theme-core.test.ts` (IDs, names, `isTheme`, `parseTheme`, no phrase in inbox records or the settings file), `theme.prop.test.ts` (any JSON value or string gives a theme; identity on the two). Updated: `status-line.test.ts`, `text.prop.test.ts` (P21 with `lead`), `ui-model.test.ts`, and `contrast.test.ts`, which now accepts string tokens.

- [x] 4. App: the setting, IPC and theme delivery
  - [x] 4.1 `PublicSettings.theme` (from 3.1); `settings.ts`: `theme` (default, `parseTheme`, serialized); old files load unchanged; the settings round-trip property includes `theme`
    - _Requirements: 1.1–1.4, 1.6_
  - [x] 4.2 `ipc.ts`: `ui:theme` with its check, `popup:theme`; `preload-main.ts` `setTheme`, `preload-popup.ts` `onTheme`; validator unit tests
    - _Requirements: 1.5; MA 15.2_
  - [x] 4.3 `controller.ts`: `onTheme`, `Ports.applyTheme`; unit test (saves, pushes state, calls `applyTheme`, nothing else; the same theme does nothing); add `applyTheme` to the existing fake ports, with no other change to those tests
    - _Requirements: 2.6_
  - [x] 4.4 `config.ts` (`MAIN_FRAME` from task 1, `POPUP.height` 144), `window-options.ts` (transparent or opaque options, `THEME_BACKGROUND`), `windows.ts` and `popups.ts` (`?theme=` and `&frame=` in the URL, `popups.setTheme` storing and broadcasting), `main.ts` wiring (`setBackgroundColor` when opaque); window-option unit tests
    - _Requirements: 2.5, 2.7, 3.6, 8.3, 8.4, 8.6_
  - Result (2026-11-13): 528 tests pass; the existing controller and app tests pass with only `applyTheme` added to their fake ports. `controller.ts` grew to 211 lines, so the pop-up card and notification text moved unchanged to `src/app/ping-content.ts` (controller now 192 lines). The pop-up window is 144 px high, so a 920-point-high visible area stacks 5 pop-ups instead of 6 before the oldest closes (MA 9.6's rule unchanged); `app-basics.test.ts` follows. The main window is now transparent (`MAIN_FRAME`), but until task 6.1 the old stylesheet still paints `body` edge to edge, so its corners stay square; the page does not read `?theme=` until task 5.2.

- [x] 5. Theme tokens and sprites
  - [x] 5.1 `styles/themes.css` with both blocks from the design's token table, `[data-theme-preview]`, `[data-frame="opaque"]` and the hidden-until-themed rule. `tokens.css` stays until task 6, as the only allowed exception of the color rule.
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 8.4_
  - [x] 5.2 `src/ui/theme.ts`: apply the theme and the frame from the page query on load, and from each snapshot; `bridge.ts` gives `blue-bot` in the browser
    - _Requirements: 2.4, 2.7, 2.8_
  - [x] 5.3 `sprites/types.ts`, `sprites/blue-bot.ts`, `sprites/strawberry-milk.ts` (rectangles copied from `FacesBot`, `FacesCute`, `MainBot`, `MainCute`, roles only), `sprites/render.ts`, `styles/sprites.css` (role fills, agent bodies, badges)
    - _Requirements: 6.1–6.9, 12.1_
  - [x] 5.4 Tests: `themes.test.ts` (same names in both blocks; the color rule over CSS, TS and HTML; `THEME_BACKGROUND` equals `--bg`); `sprites.test.ts` (export shape, grid bounds, a `--px-*` token for every role, grey roles only in `OFFLINE`/`ENDED`, badges exactly on state sprites of 26 px or more that are not `OFFLINE`, rectangles equal to the mockups read in the test); the token-set property in `theme.prop.test.ts`
    - _Requirements: 3.2, 3.3, 6, 11.1, 11.2_
  - Result (2026-11-13): 552 tests pass. The two theme blocks (144 lines each, 141 tokens) are in `styles/themes/blue-bot.css` and `styles/themes/strawberry-milk.css`, imported by `themes.css` (the build inlines them; both blocks and the `[data-theme-preview]` selectors reach `dist/ui`). The sprite modules were generated once from the mockup files (Blue Bot faces 18/18/16/14/14/9/19 rectangles, Strawberry Milk 11/14/13/9/10/8/15, plus title and `me`); `sprites.test.ts` reads the mockups again and compares every rectangle after turning roles back into the theme's colors. Both pages now load `themes.css` and `sprites.css` and set `data-theme` from the URL and from each snapshot or `popup:theme`. Interim, until 6.6: `themes.css` overrides the old `tokens.css` where names are the same (`--frame`, `--text`, `--text-2`, `--line`, `--group-text`, `--on-fill`, `--me-*`), so the old screens show some new colors; no screen uses sprites yet.

- [ ] 6. Screens in both themes (one commit per sub-task)
  - [x] 6.1 Progress cells model and the main window skeleton: `model/list.ts` progress `cells` (`m` cells, `n` done, one current while `WORKING` and `n < m`, none above 30 or for `m = 0`) and `lead` on buddy and session view models, with unit tests; `main.css` rewritten for the window, title bar, alert strip, tabs and footer from `MainBot`/`MainCute` with tokens only; `index.html` and `chrome.ts` (title sprite, `.title-mark`, `.alert-mark`, `.relay-mark`)
    - _Requirements: 4.1, 7.1, 7.3; MA 5.9_
    - Result (2026-11-13): `src/ui/model/progress.ts` (`progressCells`, `progressView`; `list.ts` uses it and lost the unused `phraseOf`, 199 lines) with `ui-progress.test.ts`. `main.css` now draws the window (frame, round corners, pattern), title bar (title sprite, `.title-mark`), alert strip (`.alert-mark`), tabs and footer (`.relay-mark`, `--text-on-bg`) from theme tokens; `html` and `body` are transparent. Added `--relay-dot-radius` to both themes for the square dot. The Inbox count is now `.count-badge`, since `.badge` is the sprite badge. Settings' connection dots use `.relay-mark` until 6.4. The list, `me` row, inbox and settings rules still use the old tokens.
  - [x] 6.2 Buddy list and the `me` row: `screens/list.ts` (26 px and 16 px sprites, `.lead-work`, `.unread-mark`, `┗`, the urgent-row rule of D12, progress cells and bar) and its rules in `main.css`; `screens/me.ts` (the 34 px `me` sprite, the row as a card)
    - _Requirements: 4, 6.4, 6.5, 7.1–7.3_
    - Result (2026-11-13): 559 tests pass. `screens/list.ts` draws 26 px buddy sprites and 16 px session sprites (`stateSprite`, with the state name for screen readers, now in `sprites/render.ts`), `.lead-work`, `.unread-mark`, progress cells or the bar, and `┗` on every session row (the model's `tree` is `┗`). The `me` row draws the 34 px `me` sprite and is a card; `meView` carries the theme. The Buddies-tab rules moved from `main.css` to a new `styles/list.css` (108 lines; `main.css` 106), which uses tokens only. Every buddy-row phrase is bold in its state color (design.md); the top session row gets the urgent tint only for `WAITING_APPROVAL` (D12). Added `--me-line-width` to both themes. `--cells` (the number of cells) is set through the CSSOM.
  - [x] 6.3 Inbox: `screens/inbox.ts` (26 px sprites with badges, `.unread-mark`, the unread tints) and its rules in `main.css`
    - _Requirements: 7.7_
    - Result (2026-11-13): 561 tests pass. Inbox rows draw the agent's 26 px sprite with its badge; the agent comes from the session key (`agentOfKey` in `model/inbox.ts`; a key of another form gives no sprite, only the state name as text). The theme's unread marker replaces the dot. Unread needs-OK rows get the urgent tint with a 3 px inset left line (an inset shadow, so the row does not shift), unread turn-done rows `--unread-tint`; the line is bold in its state color. `Mark all read` uses the quiet button style. The inbox rules moved to a new `styles/inbox.css` (31 lines); `main.css` is 83 lines.
  - [x] 6.4 Settings: `model/theme.ts` (`themeTiles`) with unit tests; `screens/settings.ts` with the Theme card first (native radios, previews through `data-theme-preview`, the note, `setTheme`), card titles, `accent-color`, connection marks; its rules in `main.css`
    - _Requirements: 2.1–2.4, 7.7_
    - Result (2026-11-13): the Theme card is first: `Theme`, a `radiogroup` of two native radios (`name="theme"`, visually hidden but focusable; the tile shows the focus ring through `:has(:focus-visible)`), each tile with a mini window in its own theme (`data-theme-preview` on the mini window only, so the tile itself stays in the current theme), the 22 px Claude working face, the theme name and a check on the selected one, then the note. `change` calls `setTheme`; `data-focus` keeps focus on the tile across the re-render. Card titles in Jua 15 px, checkboxes in `--primary-bg`, connection lines with `.relay-mark`. New tokens in both themes for the mini window (`--preview-radius`, `--preview-pattern-size`, `--preview-bar`, `--preview-bar-radius`). Rules in a new `styles/settings.css`; `main.css` is 70 lines. `ui-theme.test.ts` covers `themeTiles` and the card's markup.
  - [x] 6.5 Pop-up: `popup.html`, `popup.css`, `screens/popup.ts`: the `<h1>` title with its `aria-label`, × named `Close and mark as read`, `.go-mark`, colors by kind and theme, both kinds with all three buttons and MA 9.5's click handling unchanged; `onTheme` fills the card again with the last content
    - _Requirements: 2.5, 7.4–7.6_
    - Result (2026-11-13): the title is an `<h1>` (`띠링! ♪ needs your OK` / `띠링! ♪ new message`) with `aria-label` `Ding! needs your OK` / `Ding! new message`; × is `Close and mark as read`; `Go there` ends with `.go-mark` (▶/♥). Both ping kinds keep ×, `Later` and `Go there`, and the click handler is unchanged. The 44 px sprite needs the agent, so `PopupContent` gained `agentId` (set in `ping-content.ts` when the buddy is in the list; without it the card shows only the state name as text). `onTheme` re-fills the card from its last content in the new theme. The card sits at the bottom of its 144 px transparent window, which leaves room for the 4 px shadow. `popup.css` rewritten with tokens; the page no longer loads `icons.css`. `ui-popup.test.ts` covers the markup, the titles and labels, the buttons on both kinds, the click handling and the re-fill.
  - [ ] 6.6 Remove `tokens.css`, `icons.css`, `icons.ts`, `ui-icons.test.ts` and the color-rule exception; `contrast.test.ts` rewritten with the design's pair table in both themes and its listed exceptions
    - _Requirements: 3.3, 3.5, 9, 11.1_

- [ ] 7. Checkpoint and mutation check
  - All tests pass; `npm run build` succeeds; every changed file stays under about 200 lines; grep for color values outside `themes.css` and `src/app/window-options.ts`, for `/Users/` paths other than `/Users/dev/`, user names and token-like strings.
  - Mutation check, one at a time, each reverted with `git checkout -- <file>` before the next: (a) delete one token from the Strawberry Milk block; (b) set Blue Bot `--text-2` to `#8A9BBF`; (c) make `parseTheme` return its input when it is a string. Record which tests failed for each. If one passes unnoticed, add the missing test before going on.
  - _Requirements: 11.3, 11.4_

- [ ] 8. Visual check with the builder
  - Announced first with what appears and for how long, run once with a fixed time limit, results written to a file while it runs, nothing left running afterwards (MA working rules). With a temp HOME and port 4399 so the app starts its own relay, and fake events with `/Users/dev/...` paths and no real prompts: the three tabs in both themes next to the mockups; switching the theme while a pop-up is open (it changes, does not move, does not close); the Theme card with the keyboard (Tab, arrow keys, Space); the corners as O5 decided, the transparent window's shadow and its 420 px minimum height (both not checked in O5); the menu bar icon unchanged. Run the app in the foreground of the tool call, so the call returns only after it has ended. Then the relay's page in a browser shows Blue Bot.
  - _Requirements: 2, 7, 8.3, 8.4, 10_

- [ ] 9. Steering, README and final checkpoint
  - structure.md (`src/core/theme.ts`, `src/ui/sprites/`, `src/ui/theme.ts`, `model/theme.ts`, `styles/themes.css` as the only file with colors, no `icons.ts`); tech.md property list (theme properties); README (the Theme setting, Jua, the corner outcome in the known limits).
  - All tests pass and `npm run build` succeeds. `.gitignore` does not list `.kiro`.
  - _Requirements: 5.4, 8.5, 11.4_
