# Requirements: Themes

## Introduction

This spec replaces the app's single Y2K sky-blue look with two themes the user can choose: **Blue Bot** (default) and **Strawberry Milk**. Both themes use the same layout and the same words. A theme changes only colors, corner radii, background patterns, a few decoration characters and the buddy sprites. The look comes from `.kiro/steering/design.md` (updated 2026-11-13) and the mockups `docs/mockups/MainBot`, `PopupBot`, `FacesBot`, `MainCute`, `PopupCute`, `FacesCute` and `ThemePicker`.

It builds on the finished messenger-app spec (`.kiro/specs/messenger-app/`). That spec's files are not edited. Every criterion of it that this spec changes is listed in the table below. Behavior that nobody has observed is marked **UNVERIFIED** and is never guessed.

**Principle: this spec changes the look, not the behavior** (builder, 2026-11-13). Every behavior of the messenger-app spec stays as it is: what pings, what acknowledges, what a click or a key does, what is stored and what is sent. The only behavior changes are the three marked "behavior" in the table below (how Kiro progress is drawn, `띠링!` in the pop-up title, and the two core phrases that lose their leading `♪`) and the theme setting this spec adds. Where design.md or a mockup seems to change a behavior, the messenger-app spec wins unless the builder says otherwise.

## Changes to earlier criteria

"MA" means a requirement of the messenger-app spec.

| # | Earlier criterion | Was | Becomes | Kind | Here |
|---|---|---|---|---|---|
| T1 | MA 14.1–14.3; design `Settings` | five switches; settings file without a theme | adds `theme`; a Theme card comes first in Settings | addition | Req 1, 2 |
| T2 | MA 6.11; design "Tokens"; MA 18.7 | one palette in `tokens.css` on `:root`; `--me-*` aliases | two palettes on `:root[data-theme="…"]`, one token set; the `--me-*` tokens become theme tokens | look | Req 3 |
| T3 | MA 7.2 (WORKING phrase) | `♪ working…`, `♪ studying hard` | the leading glyph comes from the theme (`▸` or `♪`); the words stay | look | Req 4 |
| T4 | MA 16.5; design "Fonts" | Nanum Gothic and Silkscreen | Nanum Gothic and Jua; Silkscreen removed | look | Req 5 |
| T5 | MA 6.4, 6.5, 6.7, 9.7, 11.3; design "State icons" | 14/12/28 px circle state icons | buddy sprites with a state badge (26/16/44 px; 34 px for `me`) | look | Req 6 |
| T6 | MA 5.9; design "Main window" | bubble icon and `AgentBuddy` in Silkscreen | sprite icon, `AgentBuddy` in Jua and the theme's title mark | look | Req 4, 6, 7 |
| T7 | MA 6.4, 11.3 | 8 px unread dot | the theme's unread marker (`N` tag or `♥`) | look | Req 4, 7 |
| T8 | MA 6.5 | tree marks `├` / `└` | `┗` on every session row | look | Req 7 |
| T9 | MA 6.4 (Kiro progress) | `n/m` and one striped bar | `n/m` unchanged in meaning; Blue Bot draws one cell per task (a single bar above 30 tasks), Strawberry Milk a rounded striped bar | behavior | Req 7 |
| T10 | MA 9.7; product.md "Language and tone" (UI text in English) | title `Ding! ♪ needs your OK` / `Ding! ♪ new message` | `띠링! ♪ needs your OK` / `띠링! ♪ new message`, read by screen readers as `Ding!`; the only Korean UI text, recorded as an exception in product.md | behavior | Req 7 |
| T11 | MA 9.7 (accessible name of ×) | `Close message` | `Close and mark as read`, which names what × already does (MA 9.5) | look | Req 7 |
| T12 | MA 5.1; MA decision A14; design "Window corners" | opaque window, 10 px corners all round | transparent window with the theme radius (16 or 18 px), or opaque with square corners, decided by one check | look | Req 8 |
| T13 | MA 6.13; design "Contrast" | one palette checked | every text and graphic pair checked in both themes | look | Req 9 |
| T14 | MA 7.2; MA design `text.ts` (`PHRASES`, `SPEC_TASK_PHRASE`) | the core's phrase strings `♪ working…` and `♪ studying hard` | `working…` and `studying hard`; the screen draws the theme's glyph before them (T3). Every other phrase string is unchanged. Affected: the status lines on screen (the glyph comes back through CSS); macOS notifications, pop-ups and the inbox file are not affected, because none of them ever holds a `WORKING` phrase (see design "Phrase strings"); tests that name the old strings (`status-line.test.ts`, `text.prop.test.ts` P21, `ui-model.test.ts`) | behavior | Req 4 |

## Scope

### In scope
- The `theme` setting, its file format and its check.
- The Theme card in Settings, applying a theme at once to the main window and to every open pop-up.
- Two complete token sets, the decoration characters, Jua, the sprites and badges, and the look changes design.md asks for.
- The transparent-window check and the corner outcome.
- Tests for token sets, contrast, the setting, and one mutation check of those tests.

### Out of scope
- A third theme, user-defined colors, or following the macOS light and dark appearance.
- Changing the menu bar icon (it stays the template image of MA 5.8).
- The relay's page in a browser getting a theme switch.
- Any behavior change beyond T9, T10 and T14, including the "my status" behavior of MA Req 18 and every pop-up button (MA 9.5).
- The demo build and the packaged `.app` (later specs, builder's order of 2026-11-13).

### Given by the builder (2026-11-13)
- `theme` is `"blue-bot"` or `"strawberry-milk"` in `app-settings.json`; missing or unknown means `"blue-bot"`; existing files keep working.
- Every color, corner radius and decoration character comes only from CSS custom properties on `:root[data-theme]`. The Y2K sky-blue values and Silkscreen are removed. Jua ships with its OFL license.
- Sprites live in one module per theme (`sprites/blue-bot.ts`, `sprites/strawberry-milk.ts`) with the same export shape. Their pixels are copied from the mockups. The state badge glyphs stay in both themes.
- The menu bar icon does not change with the theme.
- The transparent-window resize check runs exactly once, announced first as "지금 띄웁니다, 30초", and its window and process are closed and confirmed closed before the tool call returns. If height resize fails, the app ships an opaque window with square corners. The spec records which one shipped.
- This spec changes the look, not the behavior; the only behavior changes are `띠링!`, the Kiro progress drawing, and the two core phrase strings of T14 (builder, 2026-11-13).
- No third-party character or mascot is copied; only the mockup pixels are used. Test and demo data hold no real paths, names or prompts. Any change to settings outside this repository goes backup, then diff, then the builder's approval.

## Glossary
- **Theme**: one of `blue-bot` and `strawberry-milk`. **Theme name**: `Blue Bot`, `Strawberry Milk`.
- **Token**: a CSS custom property that a theme defines, for example a color, a radius, a shadow, a background pattern or a decoration character.
- **Token set**: the names of all tokens one theme defines.
- **Decoration character**: a theme-specific character shown as decoration (Req 4).
- **Sprite**: a 12 × 12 pixel buddy drawn as SVG rectangles. Its body color names the agent; its face shows the state.
- **Badge**: the small shape with a glyph at the bottom-right of a sprite that names the state.
- **Theme card**: the first card in Settings, where the user picks a theme.
- **Open pop-up**: a pop-up window on screen at the moment of a theme change.

---

## Requirement 1: The theme setting

**User story:** As a user, I want the app to remember which theme I picked.

### Acceptance criteria
1. THE settings file SHALL hold `theme` with the value `"blue-bot"` or `"strawberry-milk"`.
2. WHEN `theme` is missing, is not a string, or is any other string, THE app SHALL use `"blue-bot"`. A settings file written before this spec SHALL load with every other setting unchanged.
3. Reading the theme SHALL never throw, for any JSON value.
4. Saving the settings and reading them back SHALL give the same theme and the same other settings.
5. THE main process SHALL accept a theme change from the main window only when the value is one of the two themes (MA 15.3), and SHALL drop anything else.
6. A theme change SHALL be saved the same way as other settings (MA 14.2: mode 600, written atomically).

## Requirement 2: Choosing a theme

**User story:** As a user, I want to pick a theme from a small preview and see the whole app change at once.

### Acceptance criteria
1. THE Settings tab SHALL show a Theme card above every other card, as in `ThemePicker.dc.html`: the title `Theme`, two preview tiles side by side (a mini window in that theme with its sprite, and the theme name), and the note `Changes the window and the popups at once. Saved on this computer only.`
2. THE two tiles SHALL form a radio group named `Theme`. EACH tile SHALL be a radio whose accessible name is the theme name. The selected tile SHALL be marked as checked and SHALL show a 2 px border in the theme's primary color and a check after its name.
3. THE radio group SHALL work with the keyboard: Tab reaches the selected tile, the arrow keys move the selection to the other tile and select it, Space selects the focused tile.
4. WHEN the user selects a theme, THE main window SHALL change to it without a reload, and keyboard focus SHALL stay on the tile.
5. WHEN the user selects a theme, EVERY open pop-up SHALL change to it without being closed or moved, and every later pop-up SHALL open in it.
6. A theme change SHALL NOT restart the app, reconnect to the relay, ping, add an inbox record, or change any other setting.
7. WHEN the app starts, THE main window and the pop-ups SHALL show the saved theme from their first frame, with no flash of the other theme.
8. THE relay's page in a browser SHALL always show Blue Bot and SHALL NOT show the Theme card (it has no Settings tab, MA 6.12).

## Requirement 3: Tokens

**User story:** As the builder, I want each theme to be one block of values, so that a theme changes the look without touching components.

### Acceptance criteria
1. EVERY color, border, corner radius, shadow, background pattern and decoration character in the UI's stylesheets SHALL come from a token defined on `:root[data-theme="blue-bot"]` or `:root[data-theme="strawberry-milk"]`.
2. BOTH themes SHALL define exactly the same token set.
3. No stylesheet, page or UI script other than the theme token file SHALL hold a color value (hex, `rgb()`, `hsl()` or a named color other than `transparent` and `currentColor`).
4. THE token values SHALL be those of design.md. WHERE a mockup and design.md disagree on a color, design.md SHALL decide (design.md, intro). Where design.md names no value, the mockup's value SHALL be used. The design document lists every value taken from a mockup.
5. THE Y2K sky-blue values of the messenger-app palette that design.md no longer names SHALL be removed. The `--me-*` tokens of MA 18.7 SHALL become theme tokens.
6. THE main window's native background color (MA design `backgroundColor`) SHALL follow the theme, or SHALL be transparent when the window is transparent (Req 8).

## Requirement 4: Decoration characters

**User story:** As a user, I want the little characters to match the theme.

### Acceptance criteria
1. THESE characters SHALL come from tokens:

   | Where | Blue Bot | Strawberry Milk |
   |---|---|---|
   | before `working…` and `studying hard` (buddy rows, session rows, pop-ups) | `▸` | `♪` |
   | the working badge | `▸` | `♪` |
   | after `Go there` | `▶` | `♥` |
   | after `AgentBuddy` in the title bar | `▸` | `♡` |
   | unread marker at the end of a row | `N` (a tag) | `♥` |
   | before the alert strip text | `!` | `♥` |

2. THE words of every phrase SHALL be the same in both themes (design.md "Status phrases"). THE core phrases SHALL carry no theme glyph; the screen adds it. THE core's `WORKING` phrases change from `♪ working…` to `working…` and from `♪ studying hard` to `studying hard` (T14); no other core phrase changes.
3. Decoration characters SHALL be hidden from screen readers. Where one carries meaning (the unread marker), the meaning SHALL be given as text (`unread`).
4. Decoration characters SHALL NOT be emoji (design.md).
5. Text that leaves the window carries no theme glyph: macOS notifications keep the plain phrase (MA 8.8), and nothing in the inbox file or the settings file depends on the theme.
6. No stored file SHALL hold a phrase string, so a file written before this spec can never show a glyph twice (design "Phrase strings").

## Requirement 5: Fonts

**User story:** As a user, I want the friendly rounded titles of the mockups.

### Acceptance criteria
1. THE app SHALL ship Jua (Regular) with its OFL license file, next to Nanum Gothic, and SHALL load both from its own files only (MA 16.5).
2. Silkscreen and its license file SHALL be removed from the app and the build.
3. Titles, buddy and agent names, tabs, buttons, group headers, card titles and the pop-up title SHALL use Jua, with Nanum Gothic after it in the font stack. Other text SHALL use Nanum Gothic (design.md "Type").
4. THE README third-party table SHALL list Jua instead of Silkscreen.

## Requirement 6: Sprites and badges

**User story:** As a user, I want little pixel buddies whose faces show what each agent is doing.

### Acceptance criteria
1. EACH theme SHALL have one sprite module, `src/ui/sprites/blue-bot.ts` and `src/ui/sprites/strawberry-milk.ts`, with the same export shape. Nothing outside these modules SHALL hold sprite pixels.
2. A sprite SHALL be a 12 × 12 grid of SVG rectangles with `shape-rendering="crispEdges"`, with the same rectangles and colors as the mockups: the state faces from `FacesBot` and `FacesCute`, and the title-bar icon and the `me` sprite from `MainBot` and `MainCute`. No pixel SHALL come from anywhere else.
3. THE body color SHALL name the agent (design.md "Buddy sprites" table). `OFFLINE` and `ENDED` sprites SHALL use the theme's grey instead.
4. Sprites SHALL replace the state icons: 26 px in buddy rows, 16 px in session rows, 44 px in pop-ups, the inbox rows' size from the design, 34 px for `me`, 20 px in the title bar.
5. EVERY sprite of a state that is 26 px or larger (buddy rows, inbox rows, pop-ups), other than `OFFLINE`, SHALL carry a badge with that state's glyph, in both themes. The 16 px sprites of session rows carry none, because their phrase names the state in text beside them (builder, 2026-11-13). The glyphs: `!` waiting, `▸` or `♪` working, `✓` turn done, `?` stale, `z` idle, `×` logged off. `OFFLINE` has no badge; its blank grey face differs from every other face.
6. A badge SHALL be an HTML element laid over the sprite, not part of the sprite's SVG. Its shape (Blue Bot: rounded square; Strawberry Milk: circle), its border, its fill and its glyph SHALL all come from tokens, so `✓` is a text character. Its fill SHALL be the theme's state text color (design.md "State colors") and its glyph white.
7. Sprites and badges SHALL be hidden from screen readers, with the state name given as text (MA 6.13).
8. A state SHALL be told apart from every other state by face shape, badge glyph or the phrase beside it, never by color alone.
9. Sprites SHALL be built with `createElementNS` and attributes only, never from HTML text (MA 6.9).

## Requirement 7: Layout changes from design.md

**User story:** As a user, I want the app to look like the new mockups.

### Acceptance criteria
1. THE main window SHALL follow `MainBot` and `MainCute` in both themes: the patterned background, the title bar (sprite icon, `AgentBuddy` and the title mark, pin, minimize and close-to-menu-bar buttons of 22 × 22 px), the `me` row and the buddy list as cards, the alert strip with its decoration character, the tabs as separate rounded buttons with the Inbox count badge, and the footer.
2. Buddy rows SHALL end with the theme's unread marker WHILE any of their sessions is unacknowledged (MA 6.4). Session rows SHALL start with `┗`. THE most urgent session row SHALL use the theme's urgent-row style (tint and left line) WHEN it is `WAITING_APPROVAL`, and otherwise only a 3 px left line in its state color (builder, 2026-11-13).
3. Kiro progress SHALL keep the meaning it has today (MA 6.4, tech.md "Progress from `tasks.md`"): `n` done top-level tasks of `m` counted ones, shown as `n/m`, and `?/?` with no bar or cells when unknown. Under the line:
   - Blue Bot: `m` cells, the first `n` drawn as done; WHILE the buddy is `WORKING` and `n < m`, the next cell drawn as current; the rest as to-do. The cell count follows `m`, never the mockup. WHEN `m` is above 30, one continuous bar in the same colors, filled to `n/m`.
   - Strawberry Milk: one rounded striped bar filled to `n/m`.
4. BOTH pop-up kinds SHALL keep MA 9.5 exactly: ×, `Later` and `Go there` with the theme's character after it. × closes and acknowledges; `Later` closes only; `Go there` and a click anywhere else on the card go there.
5. THE pop-up title SHALL be `띠링! ♪ needs your OK` or `띠링! ♪ new message`. THE title SHALL be a heading whose `aria-label` is `Ding! needs your OK` or `Ding! new message`, so screen readers read `Ding!` in place of `띠링!` and skip `♪` (builder, 2026-11-13). × SHALL be named `Close and mark as read`.
6. THE pop-up card SHALL take its border, radius, header gradient and colors from the theme and the pop-up kind (design.md "Ding! popup").
7. THE Inbox and Settings tabs SHALL keep the layout of `Inbox.dc.html` and `Settings.dc.html` with the theme's cards, colors, fonts, sprites and unread marker. Checkboxes SHALL use the theme's primary color (`accent-color`).
8. Every other behavior of the messenger-app spec SHALL stay as it is.

## Requirement 8: Window corners

**User story:** As a user, I want the window's rounded corners of the mockups, as long as I can still resize it.

### Acceptance criteria
1. Before the main window is changed, THE builder and the agent SHALL run one check of a transparent, frameless, resizable 320 px window on this machine: does its height resize from the edges, is the minimum height of 420 px kept, does the title bar still drag it, and do its corners show the theme radius with nothing drawn outside them.
2. THE check SHALL be announced first with "지금 띄웁니다, 30초", SHALL run once with no repeat, and SHALL end within 30 seconds by itself. Its window and process SHALL be closed, and confirmed closed, before the tool call that ran it returns.
3. WHEN the height resizes in that check, THE main window SHALL be transparent, and its frame SHALL be drawn by the page with the theme radius on all four corners (16 px Blue Bot, 18 px Strawberry Milk).
4. WHEN the height does not resize, THE main window SHALL stay opaque, with square corners (radius 0) and the same colors.
5. THE requirements SHALL record the outcome with date and versions, and the design and the README known limits SHALL follow it.

   **Outcome (O5, 2026-11-13): transparent.** Criterion 8.3 applies; 8.4 does not. See Observations.
6. Pop-ups SHALL keep their transparent window (MA design) and SHALL use the theme radius on their card.

## Requirement 9: Contrast and accessibility in both themes

**User story:** As a user, I want every theme to stay easy to read.

### Acceptance criteria
1. EVERY text color and background pair the stylesheets use SHALL have a contrast of at least 4.5:1 in both themes, including 11 px secondary text. Text that sits directly on the patterned background SHALL also pass against the pattern's color.
2. EVERY icon, badge, unread marker, dot and focus ring SHALL have at least 3:1 against what it sits on, in both themes. A graphic below 3:1 is allowed only when text beside it says the same thing, and each such pair SHALL be listed by name in the design and in the contrast test.
3. EVERY focusable element SHALL show the theme's focus ring (design.md: 2 px outline, offset 2).
4. MA 6.13 (real buttons, labels, `aria-label` on icon-only buttons) SHALL hold in both themes.

## Requirement 10: Menu bar icon

### Acceptance criteria
1. THE menu bar icon SHALL stay the template image of MA 5.8 in both themes, and a theme change SHALL NOT touch it.

## Requirement 11: Tests

### Acceptance criteria
1. Unit tests SHALL cover:
   - both themes define the same token set, and every token of either theme has a value;
   - no stylesheet, page or UI script outside the theme token file holds a color value (Req 3.3);
   - every text pair of the stylesheets at 4.5:1 and every graphic pair at 3:1, in both themes, with the listed exceptions (Req 9);
   - reading `theme` from old settings files, missing values, wrong types and unknown strings; the IPC check of a theme change;
   - both sprite modules have the same export shape, give a sprite for every agent and state, keep every rectangle inside the 12 × 12 grid, and use the grey for `OFFLINE` and `ENDED`;
   - the sprite rectangles equal the mockup rectangles (read from the mockup files in the test, so a later edit of either shows up);
   - badges only on state sprites of 26 px and larger, never on `OFFLINE`;
   - the new phrase strings (T14), `lead` exactly for `WORKING`, and that no field of an inbox record or of the settings file holds a phrase;
   - a theme change in the controller saves the settings and pushes state, and sends nothing else (no ping, no inbox record, no relay call);
   - pop-ups get the theme, and both pop-up kinds keep ×, `Later` and `Go there` with MA 9.5's actions;
   - Blue Bot progress cells: `m` cells, `n` done, one current cell only while `WORKING` and `n < m`, one bar above 30;
   - the built UI holds Jua and its license byte for byte and no Silkscreen file, and still no `http:` or `https:` URL (MA 17.1).
2. Property tests (fast-check) SHALL cover:
   - for any JSON value as `theme`, and for any string, reading gives one of the two themes, and gives the same value for each of the two themes;
   - for any settings, saving and reading back gives the same settings, theme included;
   - for any theme and any token name of either theme, the other theme defines it too.
3. A mutation check SHALL be run once while building: one deliberate bug at a time (a token removed from one theme, a text color lowered below 4.5:1, the theme reader returning its input), each SHALL make at least one test fail, and each SHALL be reverted. The tasks record which test caught each bug.
4. Fixtures and tests SHALL contain no real home paths, user names, session IDs, tokens or prompts (MA 17.4).

## Requirement 12: Originality, privacy and the machine

### Acceptance criteria
1. Sprites, icons and decoration SHALL be original: the mockup pixels and the characters of Req 4 only. No third-party character, mascot, logo or messenger artwork SHALL be copied (design.md "Feel").
2. Theme names SHALL never mention gender (design.md "Themes").
3. A theme SHALL add no network access: no font, image or stylesheet SHALL be fetched at run time (MA 16.3, 16.5).
4. Before any change to a file outside this repository, THE agent SHALL back the file up, show the builder the diff, and wait for approval.
5. Downloading Jua SHALL wait for the builder's OK (as for the other fonts in MA task 9).

---

## Observations

### O5. Transparent main window (2026-11-13, 01:56 UTC, Electron 45.3.1, macOS 26.6.2)
A throwaway app (`scripts/o5/`, deleted afterwards) showed one frameless, transparent, resizable 320 × 620 window (`minHeight` 420, `hasShadow: true`) with a page-drawn 3 px frame and 16 px corners, and logged its window events.
- `isResizable()` was `true`.
- Bottom edge (7.5–7.9 s): the height changed from 620 to 702 and back to 617 px, `y` unchanged.
- Top edge (9.4–11.2 s): `y` and the height changed together (`y` 33–124, height 683 down to 592). Electron reported this drag as `edge=bottom` as well.
- Title bar (5.3–6.0 s, 12.0–12.8 s): the window moved.
- The height never went below 592 px, so the 420 px minimum was not exercised.
- The builder saw the four corners round. The shadow was not watched (UNVERIFIED).
- Procedure: the check was started with `&` inside the tool call, so the call returned at once instead of waiting; the next call found the app's four processes still running at about 13 s and stopped them at about 29 s, before the app's own 30-second exit. Nothing was left afterwards (0 processes, temp data, log and output deleted, nothing under `~/Library/Application Support`). Later checks run the app in the foreground of the tool call.

## Unverified behavior

| Behavior | Status | Handling until observed |
|---|---|---|
| The transparent main window's shadow | not watched in O5 | `hasShadow: true` as in O5; looked at in task 8 |
| The 420 px minimum height of a transparent window | not exercised in O5 | `minHeight` as today; tried in task 8 |

## Decisions (builder, 2026-11-13)

| # | Question | Decision |
|---|---|---|
| D1 | Badge fills. design.md pointed at the Faces mockups, which draw no badges; two Main-mockup fills failed 3:1 (Blue Bot `!` `#FF7A1A` 2.61, Strawberry Milk `z` `#C99A1E` 2.58); `?` and `×` had none. | Each theme's state text color, white glyph (lowest 5.07:1, Strawberry Milk idle). design.md updated. |
| D2 | Offline badge (six glyphs for seven states). | No badge for `OFFLINE`. |
| D3 | Where the badge glyph comes from (SVG text cannot read a token). | An HTML element over the sprite; shape, fill and glyph from tokens; `✓` becomes a text character. |
| D4 | Turn-done pop-up buttons. design.md said "needs-OK only". | A mistake in design.md: both kinds keep MA 9.5 (×, `Later`, `Go there`, card click). design.md updated. This spec changes the look, not the behavior. |
| D5 | Blue Bot progress cells. The mockup's `16/19` shows 15 done, 1 current, 3 to-do. | `n/m` keeps the app's meaning and the cells follow it; the mockup's cell count is ignored. One current cell while `WORKING` and `n < m`. One bar above 30 tasks. The pale cells and stripes fall below 3:1 (to-do `#D6E6FA` 1.19, done `#36B9F0` 2.10, stripe `#FFB8D2` 1.51) and are allowed under Req 9.2, because `n/m` beside them says the same. |
| D6 | Mockup and design.md differ: Blue Bot Kiro phrase (`▸ grinding tasks` / `studying hard`), Strawberry Milk title mark (`✧` / `♡`), its close button (`#FF8FB1` / `#C2185B`), its tree mark (`#C9B6D6` / `#D9C2E8`), its urgent-row left border (none / 3 px), the Blue Bot current cell (`#3D8BFF` / `#2F6FD6`), the Blue Bot footer dot (`#2BBF7A` / working color). | design.md in every case. |
| D7 | Values only the mockups have. | Offline group header colors (Blue Bot `#EDF3FB` / `#4E6290`, 5.42; Strawberry Milk `#F5F1F8` / `#5A4A68`, 7.20) and Strawberry Milk's dashed row dividers (`#F0DDEA`) from the mockups. The footer's connection mark is a decoration-character token: a square dot in Blue Bot, `♥` in Strawberry Milk. |
| D8 | Strawberry Milk contrast: `text-2` `#74647F` reaches 4.31:1 on the pattern dots (`#FFDCEB`); the turn-done pop-up × is white on `#A98BEA` (2.77). | Text directly on the background uses `#5A4A68` (8.03 on the background); the turn-done × uses the title-button style (`#5A2D6E` on `#F7E9FF`, 8.87). design.md's token table updated. |
| D9 | `띠링!` against product.md's English-only UI text. | Kept; recorded as an exception in product.md. The title is an `<h1>` with `aria-label="Ding! needs your OK"` or `"Ding! new message"` (a label on a plain `<span>` is not announced). |
| D10 | The leading `♪` leaves the core phrases and comes back through CSS `::before`. | Approved, as a behavior change: T14. |
| D11 | A 9 px badge on the 16 px session-row sprites. | None there; badges only on sprites of 26 px and larger (Req 6.5). |
| D12 | design.md's urgent-row is the needs-OK orange. | Only the top session row in `WAITING_APPROVAL` gets it; other top rows get a 3 px left line in their state color. |
