# Requirements: Retro skin

## Introduction

This spec changes the **materials** of both skins so the app reads as a 2000s desktop messenger at a glance: glossy title bars, raised buttons, sunken panels, pixel fonts and buddies with hair. It renames "Theme" to "Skin" on screen, replaces the tabs with a toolbar, and adds the TIP banner. The look comes from `.kiro/steering/design.md` (updated 2026-11-13 for this spec), which follows `docs/retro-skin-brief.md` and the mockups `docs/mockups/*2000.dc.html`.

It builds on the finished messenger-app spec (`.kiro/specs/messenger-app/`, "MA") and themes spec (`.kiro/specs/themes/`, "TH"). Their files are not edited. Every criterion of theirs that this spec changes is listed in the table below. Behavior nobody has observed is marked **UNVERIFIED** and is never guessed.

**Principle: this spec changes the look, not the behavior** (builder, 2026-11-13). Exactly four behaviors change:

| # | Behavior change | Here |
|---|---|---|
| B1 | The tabs become a toolbar with the same three screens, plus a `Skin` button that opens Settings at the Skin group | Req 6 |
| B2 | The TIP banner (new), with the `hideBanner` setting | Req 9, 10 |
| B3 | Every user-facing "Theme" becomes "Skin"; the setting key stays `theme` | Req 1 |
| B4 | The toolbar is reachable and usable from the keyboard: roving tabindex over all four buttons, ←/→/Home/End (fixes the tabs, whose inactive buttons had `tabIndex = -1` and no key handling) | Req 6 |

Everything else of MA and TH stays: what pings, what acknowledges, what a click or key does, what is stored and what is sent, and the themes decisions TH D1–D12 (badge fills, no offline badge, badge as an HTML element, both pop-up kinds keep ×/`Later`/`Go there`, progress cells follow `n/m`, design.md over older mockups, contrast fixes, `<h1>` pop-up title with `Ding!` label, core phrases without decoration characters, no badges on session-row sprites, the urgent-row rule).

## Changes to earlier criteria

| # | Earlier criterion | Was | Becomes | Kind | Here |
|---|---|---|---|---|---|
| C1 | TH 2.1, 2.2; TH design "Theme card"; README | `Theme` card, radio group `Theme` | `Skin` group, radio group `Skin` | behavior (B3) | Req 1 |
| C2 | MA 5.9–5.11 (tabs); TH 7.1 | three tabs in a `tablist`; inactive tabs `tabIndex = -1`, no key handling | a `toolbar` of four buttons with a roving tabindex and ←/→/Home/End | behavior (B1, B4) | Req 6 |
| C3 | MA 5.11, 6.10 (footer) | one footer line | a status bar of sunken panels, same texts | look | Req 8 |
| C4 | MA 14.1–14.3; TH 1 | settings file without `hideBanner` | adds `hideBanner` | behavior (B2) | Req 10 |
| C5 | TH 3.4, 3.5 (token values) | soft cards, patterned background | design.md's 2000s tokens; flat background; no blurred shadows | look | Req 2 |
| C6 | TH 5 (fonts) | Jua + Nanum Gothic | Galmuri11, Galmuri9; Nanum Gothic as fallback; Jua removed | look | Req 3 |
| C7 | TH 4.1 (decoration characters) | `Go there ♥`, title marks `▸` / `♡`, unread `♥`, alert `♥`, footer `♥` | `Go there ▶` in both; title mark none / pixel strawberry; unread pixel strawberry; `!` and `●` in both | look | Req 4, 5 |
| C8 | TH 6.2, 6.4, 6.5 (sprites, sizes, badges) | sizes 26/16/34/44/20; badges on sprites of 26 px and larger; `✓` a text character | sizes 24/12/36/36/16 (+28 banner); badges by place (buddy rows, inbox rows, pop-ups); Strawberry Milk hair; `✓` a pixel icon | look | Req 4 |
| C9 | TH 7.2 (tree mark), 7.3 (progress drawing) | `┗`; cells on a framed strip | `└`; cells or bar in a sunken track; Blue Bot to-do cell `#E3EEFC` | look | Req 7 |
| C10 | TH 8.3 (corners) | theme radius on all four corners (16 / 18 px) | 7 px top, 0 bottom, 1 px frame and inner line | look | Req 2 |
| C11 | MA 6.1 (group header) | `▼ name (online/total online)` | `[−] name (online/total)`; the word `online` stays for screen readers | look | Req 7 |
| C12 | MA 5.10 (alert strip place) | under the title bar | under the me row (mockup order) | look | Req 7 |
| C13 | TH 7.6, 7.7 (pop-up, inbox, settings look) | soft cards | gloss headers, sunken frames, fieldsets, hard shadow | look | Req 11, 12 |

## Scope

### In scope
- The materials, tokens, fonts, sprites, icons and layout of design.md in both skins.
- The toolbar and its keyboard behavior; the Skin naming.
- The TIP banner, its tip list in core, the `hideBanner` setting and the Banner group in Settings.
- Tests for all of it, including every new color pair, and one mutation check.

### Out of scope
- Real ad content, network calls, auto-rotating banners, sound changes, new skins, menu bar icon changes (brief 7).
- Copying any real messenger's or operating system's name, logo, wallpaper, icons, sounds or screens.
- The relay's browser page getting the toolbar, the banner or a skin switch.
- Any behavior change beyond B1–B4.
- The demo build and the packaged `.app` (later specs).

### Given by the builder (2026-11-13)
- The setting key stays `theme`; existing `app-settings.json` files need no migration. The only new key is `hideBanner` (default `false`; anything but a boolean is `false`).
- The banner never changes by itself on a timer. Tips are a constant list in `src/core`; nothing is fetched.
- The starting tip comes from the date: the local date's day number modulo the number of tips that apply. Nothing about tips is stored. The date can be injected in tests.
- Galmuri comes from npm `galmuri` 2.40.3 (OFL 1.1): only Galmuri11 Regular, Galmuri11 Bold and Galmuri9 as woff2, with `LICENSE.txt`. Downloading waits for the builder's OK. The spec records the license and each file's SHA-256. Jua is removed.
- Missing glyphs follow brief 4: `✓` (badge) and `✎` as pixel icons, `▸` in regular weight, the tree `[−]` / `[+]` boxes as pixel icons; every other fallback character is recorded.
- The contrast test holds every new color pair of brief 2.
- Every screen check is announced right before it runs, runs once, and is confirmed cleaned up afterwards.

## Glossary
- **Skin**: one of `blue-bot` (Blue Bot) and `strawberry-milk` (Strawberry Milk); called theme in code and in the settings file.
- **Material**: one of design.md's surface styles: gloss, raised, pressed, sunken, group box, selection.
- **Toolbar**: the row of four raised buttons under the title bar.
- **Screen**: Buddies, Inbox or Settings.
- **Tip**: one entry of the built-in tip list: an ID, a headline, a body, an action and a condition for when it applies.
- **Applicable tip**: a tip whose condition holds for the current skin, settings and Inbox count.
- **Day number**: the number of days from 1970-01-01 to the local calendar date.
- **Selected row**: the buddy row with the `selection` material.
- **Fallback character**: a character the UI shows that the bundled Galmuri file of its weight does not contain.

---

## Requirement 1: Skin naming

**User story:** As a user, I want the app to call its looks "skins", like the messengers of that era.

### Acceptance criteria
1. EVERY user-facing "Theme" SHALL become "Skin": the Settings group legend, the radio group's accessible name, the toolbar, notes and aria labels. THE README SHALL say "skin" for the user-facing feature.
2. THE settings file key SHALL stay `theme` with the values `"blue-bot"` and `"strawberry-milk"`. A settings file written before this spec SHALL load with every setting unchanged (TH 1.2).
3. Internal names (CSS `data-theme`, `ThemeId`, IPC channel names, file names) MAY stay as they are.

## Requirement 2: Materials and tokens

**User story:** As a user, I want the window to look like a 2000s desktop messenger.

### Acceptance criteria
1. EVERY color, border, radius, shadow, gradient and decoration character SHALL come from tokens on `:root[data-theme="…"]` in the skin token files, with the values of design.md "Tokens" (TH 3.1, 3.3 stay).
2. BOTH skins SHALL define exactly the same token set. A role one skin does not use (for example `hair` in Blue Bot) SHALL be `transparent` there.
3. Tokens of the themes look that design.md no longer names SHALL be removed (for example the background pattern, the card shadows, `tab-active`).
4. THE main window SHALL have a 1 px `frame` border, a 1 px inner highlight line, and a radius of 7 px on the top corners and 0 on the bottom corners. It SHALL stay transparent (TH O5).
5. No stylesheet SHALL hold a blurred shadow: every `box-shadow` and `text-shadow` SHALL have a blur radius of 0.
6. THE raised, pressed, sunken, group box and selection materials SHALL be drawn as design.md "Materials" says, and SHALL be used on the elements it lists.
7. THE background SHALL be flat (no pattern), so text that sits on it is measured against one color.

## Requirement 3: Fonts

**User story:** As a user, I want crisp pixel text.

### Acceptance criteria
1. Before anything is downloaded, THE agent SHALL ask the builder and wait for the OK.
2. THE app SHALL bundle exactly these files from npm `galmuri` 2.40.3: Galmuri11 Regular, Galmuri11 Bold and Galmuri9 as woff2, and the package's `LICENSE.txt` (SIL Open Font License 1.1). THE spec SHALL record the package version, each file's name, size and SHA-256.
3. Jua and its license file SHALL be removed from the app and the build. Nanum Gothic and its license SHALL stay as the fallback.
4. ALL UI text SHALL use Galmuri11 at 12 px (400 and 700). Small text (status bar, times, captions, notes, counters, badges, toolbar labels) SHALL use Galmuri9 at 10 px. THE font stack SHALL put Nanum Gothic after Galmuri.
5. THE app root SHALL set `-webkit-font-smoothing: none`.
6. Fonts SHALL load from the app's own files only; nothing is fetched at run time (MA 16.5).
7. THE README third-party table SHALL list Galmuri (with its license) instead of Jua.
8. THE spec SHALL record, from the bundled files' character maps, every fallback character the UI can show (static texts, phrases, decoration tokens, tips), by weight.

## Requirement 4: Sprites, badges and pixel icons

**User story:** As a user, I want the little buddies of the mockups, and every mark drawn crisply.

### Acceptance criteria
1. Blue Bot sprites SHALL keep their rectangles (from `FacesBot`). Strawberry Milk sprites SHALL take their rectangles from `FacesCute2000`, `MainCute2000` and design.md "Buddy sprites": hair (`hair`, `hair-hi`, `clip`) drawn after the body and before the face, faces moved down where they touched row 3, and the turn-done smile. Offline and ended sprites SHALL use the grey hair colors and no clip.
2. Sprite pixels SHALL stay in the two sprite modules, by role, with no colors (TH 6.1); the role colors SHALL come from tokens.
3. Sprite sizes SHALL be: 24 px buddy rows and inbox rows, 12 px session rows, 36 px me row and pop-ups, 16 px title bar and Skin tiles, 28 px TIP banner.
4. THE state badge SHALL appear on the sprites of buddy rows, inbox rows and pop-ups, for every state except `OFFLINE` (TH D2), and nowhere else (TH D11 by place). It SHALL be 11 px on rows and 13 px on pop-ups, Blue Bot square and Strawberry Milk round, with a 1 px white border and a 1 px outline in `frame`. Its fill SHALL be the state text color and its glyph white (TH D1). It SHALL stay an HTML element over the sprite (TH D3).
5. THE `✓` badge glyph, the `✎` edit mark and the `[−]` / `[+]` group boxes SHALL be pixel icons. `▸` SHALL always be set in regular weight. THE other badge glyphs SHALL come from tokens.
6. THE Strawberry Milk unread marker SHALL be the pixel strawberry of design.md, `role="img"` with `aria-label="new"`. THE same strawberry SHALL follow `AgentBuddy` in the Strawberry Milk title bar and SHALL appear in the Blue Bot skin tip's body, `aria-hidden` in both places. No `♥` or `♡` SHALL remain in Strawberry Milk.
7. THE Blue Bot unread marker SHALL stay the `N` tag.
8. THE toolbar icons SHALL be the 8 × 8 icons of `MainBot2000` / `MainCute2000`, drawn at 16 px.
9. Sprites and pixel icons SHALL be built with `createElementNS` and attributes only (TH 6.9), with `shape-rendering="crispEdges"`, and SHALL be hidden from screen readers unless this requirement says otherwise.
10. No pixel SHALL come from anywhere but the mockups and design.md (TH 12.1).

## Requirement 5: Title bar

### Acceptance criteria
1. THE title bar SHALL use the gloss material: the 16 px title sprite, then `AgentBuddy` in bold `title-text` with its `title-shadow`, then (Strawberry Milk only) the pixel strawberry. Blue Bot SHALL show no title mark.
2. THE pin, minimize and close-to-menu-bar buttons SHALL be 19 × 17 px with radius 3 and the `title-btn` or `close-btn` token, and SHALL keep their glyphs, accessible names and actions (MA 5.9, 5.12).
3. Dragging the title bar SHALL still move the window.

## Requirement 6: Toolbar (B1, B4)

**User story:** As a user, I want big friendly buttons to switch screens, and I want to reach all of them from the keyboard.

### Acceptance criteria
1. Under the title bar, THE main window SHALL show a toolbar with four raised buttons in one row, each a 16 px icon above a Galmuri9 label: `Buddies`, `Inbox`, `Settings`, `Skin`.
2. `Buddies`, `Inbox` and `Settings` SHALL open their screen, as the tabs did. THE button of the open screen SHALL be pressed and SHALL carry `aria-current="page"`.
3. `Inbox` SHALL show the Inbox count (the number of unacknowledged entries of today, as the tab did) in a square badge at its top right, with ` unread` as screen-reader text, and SHALL hide it at 0.
4. WHEN the user presses `Skin`, THE main window SHALL open Settings, scroll the Skin group into view and move keyboard focus to the checked skin radio. `Settings` SHALL then be the pressed button. `Skin` itself is never pressed.
5. THE toolbar SHALL be `role="toolbar"` with `aria-label="Screens"`. Exactly one of its buttons SHALL have `tabIndex = 0` and the others `-1`. WHEN the open screen changes, its button SHALL get `tabIndex = 0`.
6. WHILE focus is on a toolbar button: → SHALL move focus to the next button and ← to the previous one, wrapping at the ends; Home SHALL move focus to the first button and End to the last; the button that receives focus SHALL get `tabIndex = 0`. Moving focus SHALL NOT open a screen. Enter and Space SHALL press the focused button.
7. THE screens SHALL stop being tab panels and SHALL be labelled regions named `Buddies`, `Inbox` and `Settings`.
8. THE toolbar SHALL be app-only; the relay's browser page SHALL NOT show it (as the tabs before).

## Requirement 7: Buddies screen look

### Acceptance criteria
1. THE order SHALL be: title bar, toolbar, me row, alert strip, buddy list, TIP banner, status bar (`MainBot2000`).
2. THE me row SHALL use the `me-panel` box with a `box-line` border, the 36 px `me` sprite in a sunken frame, `me (online)` with `(online)` in the working color, and the status message as a sunken field followed by the `✎` pixel icon. Its behavior SHALL stay MA 18.
3. THE alert strip SHALL keep its words and colors and become a 1 px solid, square strip led by `!` in both skins.
4. THE buddy list SHALL sit in one sunken white panel. Group headers SHALL stay full-width buttons with no fill: the `[−]` (open) or `[+]` (closed) box, the folder name in bold `group-text`, then `(online/total)` in `text-2`, with ` online` added as screen-reader text after the count. THE offline group SHALL read `[+] offline (n)` or `[−] offline (n)`, its name in the OFFLINE color. Parent folder names and hover paths SHALL stay (MA 6.1).
5. Buddy rows and session rows SHALL keep their content, order and actions (MA 6.4–6.6). Session rows SHALL start with `└` in `tree`. THE urgent-row rule (TH D12) SHALL stay.
6. THE buddy row that has keyboard focus, else the buddy row clicked last, SHALL be the selected row: `selection` fill, all its text white, state colors dropped, and a 1 px white border around its unread marker. Selecting SHALL change nothing else: a click still acknowledges and jumps (MA 10.3, 12.1). THE selection SHALL not be stored, and SHALL end when its buddy leaves the list.
7. Kiro progress SHALL keep its meaning (TH 7.3, D5) and SHALL be drawn in a sunken `field` track: Blue Bot 7 px cells (done `#36B9F0`, current `#2F6FD6`, to-do `#E3EEFC`; one bar above 30 tasks), Strawberry Milk a 9 px striped bar.

## Requirement 8: Status bar

### Acceptance criteria
1. THE footer SHALL become a status bar of sunken `field` panels in Galmuri9 10 px `text-2`, with the same texts as MA 5.11 and 6.10:
   - Buddies: the relay status with its `●` dot (`● relay connected`, or the other MA 6.10 texts, or a notice), then `local only`, then `on top ✓` while always-on-top is on (app only).
   - Inbox: `kept on this computer only`, `click a message to go there`.
   - Settings: none.
2. THE dot SHALL take the color of its status as today (the working color when connected).

## Requirement 9: TIP banner (B2)

**User story:** As a user, I want a small, quiet tip strip like the banners of old messengers, with nothing from the internet.

### Acceptance criteria
1. THE tips SHALL be a constant list in `src/core`, in this order, each with an ID:

   | ID | Headline | Body | Action | Applies when |
   |---|---|---|---|---|
   | `skin-blue-bot` | `★ NEW! Blue Bot skin ★` | `try it now~ click here` (+ pixel strawberry) | open the Skin group (Req 6.4) | the skin is Strawberry Milk |
   | `skin-strawberry-milk` | `★ NEW! Strawberry Milk skin ★` | `try it now~ click here` | open the Skin group | the skin is Blue Bot |
   | `click-buddy` | `TIP ▶ click a buddy` | `to jump straight to its window~` | next tip | always |
   | `sound` | `Too many dings?` | `turn the sound off here` | open Settings and focus the Ding! sound checkbox | Ding! sound is on |
   | `unread` | `n unread messages waiting!` | `click to open your inbox` | open Inbox | the Inbox count `n` is above 0 |
   | `hide-sessions` | `Busy? hide old sessions` | `press × on a session row` | next tip | always |

2. Choosing tips SHALL be pure core logic with the day number and the conditions' inputs passed in; it SHALL never read the clock, the file system or the network.
3. WHEN the main window's page gets its first state, THE banner SHALL show the applicable tip at position `d mod n` of the applicable tips in list order, where `d` is the day number of the local date at that moment and `n` the number of applicable tips. THE same day and the same conditions SHALL give the same starting tip.
4. THE banner SHALL change its tip only because of something the user did: a click on it or on `▶`, or a change of Req 9.7. No timer and no passing of time (including a new day) SHALL change it.
5. THE banner body SHALL be a `<button>` whose accessible name is the headline and the body. Clicking it SHALL run the tip's action; for a tip whose action is "next tip", it SHALL show the next tip.
6. `▶` SHALL be a `<button>` with `aria-label="Next tip"`. Clicking it SHALL show the next applicable tip after the shown one, in list order, wrapping at the end.
7. WHEN the shown tip stops applying because of a change of the skin, the settings or the Inbox count (for example the user switches to Blue Bot from the `skin-blue-bot` tip), THE banner SHALL show the next applicable tip after it, in list order. This is not an exception to "no auto-rotation": that rule forbids changes caused by time passing, and this change follows the user's own action (S15).
8. THE `unread` headline SHALL show the current Inbox count: `1 unread message waiting!` for 1, `n unread messages waiting!` for more (S16).
9. THE banner SHALL show on the Buddies screen in the app, between the buddy list and the status bar, 44 px high, as design.md "TIP banner" draws it. It SHALL NOT show on the Inbox or Settings screens, on the relay's browser page, or WHILE `hideBanner` is on.
10. Showing, changing or clicking a tip SHALL NOT ping, acknowledge, add an inbox record, call the relay or write any file. Its actions SHALL be only the screen changes of Req 9.1.
11. Tip text SHALL be plain text set with `textContent`; it carries no link, image or HTML from anywhere.

## Requirement 10: The `hideBanner` setting (B2)

### Acceptance criteria
1. THE settings file SHALL hold `hideBanner` as a boolean. WHEN it is missing or not a boolean, THE app SHALL use `false`. A settings file written before this spec SHALL load with every other setting unchanged.
2. Reading it SHALL never throw; saving and reading back SHALL give the same value and the same other settings.
3. THE main process SHALL accept a change of `hideBanner` from the main window only as a boolean (the existing setting check, MA 15.3), and SHALL save it like the other settings (MA 14.2).
4. Settings SHALL have a Banner group, second after Skin, with the checkbox `Hide the TIP banner` and the note `Tips are built in. Nothing is downloaded.` Changing it SHALL hide or show the banner at once, with no restart.

## Requirement 11: Pop-ups

### Acceptance criteria
1. Pop-ups SHALL keep their content, buttons, actions and title exactly (MA 9.5, TH 7.4, 7.5, D4, D9).
2. THE pop-up window SHALL stay 300 × 144 px (MA design `POPUP`), and the card with its shadow SHALL fit inside it.
3. THE card SHALL have a 1 px border, radius 6 px top and 0 bottom, the `hard-shadow`, a gloss header by kind, the 36 px sprite with its 13 px badge in a sunken frame, a white-to-tint body, `Later` raised and `Go there ▶` primary, with the colors of design.md "Ding! popup".
4. THE pop-ups SHALL follow a skin change at once, as before (TH 2.5).

## Requirement 12: Inbox and Settings look

### Acceptance criteria
1. THE inbox rows SHALL sit in a sunken white panel, with 24 px sprites and badges, the skin's unread marker, `Mark all read` as a raised button, and the urgent-row tint on unread needs-OK rows. Content, order and actions SHALL stay (MA 11).
2. Settings groups SHALL be `<fieldset>` + `<legend>` with the `box-line` border, in the order Skin, Banner, Window, When an agent needs you, Privacy, Connections. Rows, checkboxes and their actions SHALL stay (MA 14).
3. THE Skin group SHALL be a radio group named `Skin` of two raised tiles, each a `<label>` holding a mini window preview in its own skin, a native radio and the skin name. THE checked tile SHALL be pressed. Selecting with mouse or keyboard SHALL work as TH 2.3–2.7 (native radios with one `name`).

## Requirement 13: Contrast and accessibility

### Acceptance criteria
1. EVERY text and background pair SHALL reach at least 4.5:1 in both skins, including 10 px Galmuri9 text. On a gradient, every stop under the text SHALL pass.
2. EVERY icon, badge, unread marker, dot and focus ring SHALL reach at least 3:1 against what it sits on. A graphic below 3:1 SHALL be allowed only when text beside it says the same, and each such pair SHALL be listed by name in the design and the test. Known pairs: the toolbar icons' second figure (2.05–2.70, the label says the same), the progress cells (TH D5, `n/m` says the same), the tree box border (2.83 / 2.39, the folder name and the button's expanded state say the same).
3. ON the title bar, the pop-up headers, the TIP banner and the selected row, THE focus ring SHALL use the text color of that surface (Blue Bot gloss `#FFFFFF` 4.90, needs-OK `#5A2200`; Strawberry Milk gloss `#4A1A3E` 5.68, turn-done `#2E1B5C`; banner `#FFFFFF`; selection `#FFFFFF`), because the `focus` color reaches only 1.02–2.39 there (S14).
4. MA 6.13 and TH 9.3, 9.4 SHALL hold in both skins: real buttons and labels, `aria-label` on icon-only buttons, sprites and pixel icons hidden with the state given as text, the focus ring on every focusable element.

## Requirement 14: Tests

### Acceptance criteria
1. Unit tests SHALL cover:
   - both skins define the same token set; no color value outside the token files (TH 11.1 stays); no blurred shadow in any stylesheet;
   - every text pair at 4.5:1 and every graphic pair at 3:1 in both skins, gradient stops included, with the listed exceptions, and every pair of brief 2 by name;
   - the Strawberry Milk sprite rectangles equal those of `FacesCute2000` and `MainCute2000`, read from the mockup files; Blue Bot's still equal `FacesBot`; the strawberry and toolbar icon rectangles equal the mockups';
   - badges exactly on buddy-row, inbox-row and pop-up sprites, never on `OFFLINE`;
   - the toolbar: four buttons, one `tabIndex = 0`, ←/→ wrap, Home/End, focus moves without opening a screen, Enter/Space open it, `aria-current` on the open screen's button, `Skin` opens Settings with focus on the checked radio;
   - the tip list: conditions, `d mod n` starting tip for injected dates, next-tip order and wrapping, actions, and that no tip function reads the clock;
   - `hideBanner` from old files, missing values and wrong types; the IPC check;
   - the banner hidden on Inbox and Settings, in the browser and while `hideBanner` is on; a banner click sends nothing to the main process but screen changes;
   - the built UI holds exactly the three Galmuri files and `LICENSE.txt` byte for byte with the recorded SHA-256, Nanum Gothic and its license, no Jua, and no `http:` or `https:` URL (MA 17.1);
   - every character the UI can show is in the bundled Galmuri file of its weight or in the recorded fallback list, read from the files' character maps;
   - no user-facing "Theme" text remains.
2. Property tests (fast-check) SHALL cover:
   - for any JSON value as `hideBanner`, reading gives a boolean, and `true` only for `true`;
   - for any settings, saving and reading back gives the same settings, `theme` and `hideBanner` included;
   - for any day number and any conditions, the starting tip is applicable, and the same inputs give the same tip;
   - for any conditions, pressing `▶` as many times as there are applicable tips visits each applicable tip exactly once and returns to the start;
   - for any skin, any token name of either skin is defined by the other (TH 11.2 stays).
3. A mutation check SHALL be run once while building: one deliberate bug at a time (a hair role removed from Blue Bot's tokens, a gradient stop lowered below its contrast, the starting tip ignoring the day number, the toolbar's End key doing nothing), each SHALL make at least one test fail and SHALL be reverted. THE tasks record which test caught each bug.
4. Fixtures and tests SHALL contain no real home paths, user names, session IDs, tokens or prompts (MA 17.4).

## Requirement 15: Originality, privacy and the machine

### Acceptance criteria
1. Sprites, icons and decoration SHALL be the pixels of the mockups and design.md only. No third-party character, logo, wallpaper, icon, sound or screen SHALL be copied (brief 7).
2. THE spec SHALL add no network access at run time.
3. Before any change to a file outside this repository, THE agent SHALL back the file up, show the builder the diff and wait for approval.
4. EVERY screen check SHALL be announced right before it runs, with what will appear and for how long; SHALL run once with no repeat; SHALL end by itself; and its windows and processes SHALL be closed, and confirmed closed, before the tool call that ran it returns (tech.md).

---

## Unverified behavior

| Behavior | Status | Handling until observed |
|---|---|---|
| Which UI characters Galmuri lacks besides `✓ ✎` (all files) and `▸ −` (Bold) | brief 4, from the cmap; the rest not checked yet | checked from the bundled files after the download (Req 3.8) |
| How Galmuri11 renders at 12 px and Galmuri9 at 10 px with smoothing off in Electron 45 | not seen | the first screen check |
| The transparent main window's shadow and its 420 px minimum height | carried over from TH (not seen) | as today |

## Decisions (builder, 2026-11-13)

| # | Question | Decision |
|---|---|---|
| S1 | Gradient stops below their contrast (design.md P1) | Darker top stops: Blue Bot title-btn `#5697E8`, close `#E47647`, primary `#3374D9`; Strawberry Milk primary `#D43A73`; Strawberry Milk title-btn glyph `#4A1A3E`. |
| S2 | `line` vanishes on `bg` (P2) | New token `box-line` `#9BB8E0` / `#E3A9C5` for group boxes and the me row. |
| S3 | Strawberry Milk turn-done pop-up × (P3) | White on `#5B3A9E` (8.26). |
| S4 | Tip `double-click a buddy` (P4) | `TIP ▶ click a buddy`; the brief was wrong. |
| S5 | Unread marker on the selection fill (P5) | A 1 px white border inside the selected row. |
| S6 | Tabs unreachable from the keyboard (P6) | Fixed: roving tabindex over all four toolbar buttons, ←/→/Home/End. Recorded as behavior change B4. |
| S7 | Where the last tip is kept (P7) | Nowhere. Starting tip = day number mod applicable tips; then clicks only. Only `hideBanner` is added. |
| S8 | Galmuri11 at 11 px (P8) | Toolbar labels in Galmuri9 10 px. |
| S9 | Blue Bot title mark `▸` | Removed (Galmuri11 Bold lacks it); robot icon + `AgentBuddy` only. |
| S10 | Badges at 24 px | Badges by place: buddy rows, inbox rows, pop-ups. |
| S11 | Pop-up width (mockup 280 px) | 300 px stays. |
| S12 | Where the banner shows | The Buddies screen of the app only; not on Inbox or Settings, not on the relay's browser page. |
| S13 | Alert strip shape | Colors stay; 1 px solid, square, as the mockup. |
| S14 | The `focus` color vanishes on gloss, banner, pop-up headers and selection (1.02–2.39) | On those surfaces the ring takes the surface's text color (Req 13.3). |
| S15 | A shown tip that stops applying | Move to the next applicable tip (Req 9.7). "No auto-rotation" forbids changes caused by time; a change that follows the user's own action is allowed. |
| S16 | `1 unread messages waiting!` | `1 unread message waiting!` for 1. |
| S17 | The `sound` tip while the sound is off | Skipped; it applies only while Ding! sound is on. |
| S18 | Day number | Days from 1970-01-01 to the local calendar date. |

