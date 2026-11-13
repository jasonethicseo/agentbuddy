---
inclusion: always
---

# Design

Visual source of truth for the AgentBuddy messenger app. Reference mockups live in `docs/mockups/*.dc.html`
(HTML with inline styles; read them for exact layout, sizes, pixel art and copy; ignore the `x-dc` / `helmet` wrapper tags and the `support.js` line).
The 2000s mockups load Galmuri from design-canvas URLs (`/_blob/…`) that do not work in the repo, so their text renders in a fallback font; read them for layout, sizes, colors and copy only.
Precedence for the look: this file, then the `*2000` mockups, then the older mockups. Where a mockup and the spec disagree on behavior, the spec wins.
This version follows `docs/retro-skin-brief.md` (retro-skin spec, 2026-11-13). Every behavior decision of the themes spec (D1–D12) stays.

| Mockup | Shows |
|---|---|
| `MainBot2000`, `PopupBot2000` | Blue Bot skin (default) |
| `MainCute2000`, `PopupCute2000`, `FacesCute2000` | Strawberry Milk skin; buddies with hair |
| `SkinPicker2000` | the Skin and Banner groups in Settings |
| `FacesBot` | Blue Bot faces (unchanged) |
| `Inbox`, `Settings`, `Icons` | the original layout; still the reference for Inbox rows, Settings rows and the menu bar icon. Their colors are retired. |
| `MainBot`, `PopupBot`, `MainCute`, `PopupCute`, `FacesCute`, `ThemePicker`, `Main`, `Popup` | retired (themes spec look) |

## Feel
An original 2000s desktop messenger: a small window with a glossy title bar, raised buttons and sunken panels, pixel fonts, little pixel buddies whose faces show the state, playful status lines.
Two skins share one layout and one set of words; a skin changes only colors, the buddy sprites and a few decoration characters.
It must not copy any real messenger's, company's or operating system's name, logo, mascot, wallpaper, icons, sounds or screens. The materials below are generic conventions of that era.

## Skins
- The user-facing word is **Skin** everywhere (toolbar, Settings, aria labels, README). Code and the settings file keep the word `theme`.
- Setting `theme` in `app-settings.json`: `"blue-bot"` (default) or `"strawberry-milk"`; missing or unknown means `"blue-bot"`. Skin names never mention gender.
- Implementation: every color, radius and decoration comes from CSS custom properties set on `:root[data-theme="…"]` in the skin token files; components never hard-code a color. Both skins define the same token set (a role a skin does not use is `transparent`). Sprites come from one module per skin (`sprites/blue-bot.ts`, `sprites/strawberry-milk.ts`) with the same export shape, pixels by role.
- Switching applies at once to the main window and every open popup (IPC broadcast), no restart.
- The menu bar icon does not change with the skin (it is a macOS template image).

## Materials (both skins)
- **Window**: 1 px outer border in `frame`, 1 px inner highlight line, radius 7 px top / 0 bottom. No soft (blurred) shadows anywhere in the CSS.
- **Gloss** (title bar, popup headers): vertical gradient with a hard stop at 48 % / 52 %, plus a 1 px top highlight where the token names one. Text bold with a 1 px `1px 1px 0` text-shadow in `title-shadow`.
- **Raised (bevel)**: 1 px border, `#FFFFFF` top-left, `bevel-dark` bottom-right, background `bevel-bg` (light vertical gradient). Used for toolbar buttons, `Later`, `Mark all read`, Skin tiles. Pressed or selected: the two border colors swap and the background becomes `pressed`.
- **Sunken**: 1 px border, `sunk-dark` top-left, `#FFFFFF` bottom-right, plus `inset 1px 1px 0` in `sunk-inner`. Used for the buddy list panel, the inbox list panel, the status message field, sprite frames (me row, popups), the progress track and the status bar panels.
- **Group box**: Settings groups are `<fieldset>` + `<legend>` with a 1 px `box-line` border and radius 3.
- **Selection**: the buddy row that has keyboard focus or was clicked last has the `selection` fill and all its text in white; state colors are dropped inside it. Inside it the unread marker (`N` tag or strawberry) gets a 1 px `#FFFFFF` border, because its fill alone is 1.01 (Blue Bot) or 1.52 (Strawberry Milk) against the fill; badges already have their white border.

## Tokens
| Token | Blue Bot | Strawberry Milk | Use |
|---|---|---|---|
| bg | `#E6F0FC` (flat) | `#FDEFF5` (flat) | window background |
| frame | `#1F4E9A`, inner line `#A9D3FF` | `#B0326A`, inner line `#FFC2DC` | window border and highlight; popup border |
| gloss | `#2B6FD0` → `#2766C8` 48 % / `#1E5BBE` 52 % → `#2563C6`, top line `#8CC8FF` | `#FFD6E8` → `#FFA6CB` 48 % / `#F57FB2` 52 % → `#FF96C2`, no top line | title bar |
| title-text / title-shadow | `#FFFFFF` / `#1D4E9A` | `#4A1A3E` / `#FFE6F1` | title bar text |
| title-btn | gradient `#5697E8` → `#3A7FD8`, 1 px `#FFFFFF`, white glyph (3.01–4.03) | gradient `#FFB8D6` → `#E5679E`, 1 px `#FFFFFF`, glyph `#4A1A3E` (8.67–4.48) | pin, minimize; 19 × 17, radius 3 |
| close-btn | gradient `#E47647` → `#C8461A`, white glyph (3.01–4.83) | gradient `#E0457F` → `#A3124A`, white glyph (3.94–7.66) | close-to-menu-bar |
| toolbar | band `#D6E6FA`, bottom line `#9BB8E0`, label `#173A78` | band `#FBDCEA`, bottom line `#E3A9C5`, label `#5A2D6E` | toolbar under the title bar |
| bevel-dark | `#5C7FB0` | `#C77BA0` | raised border, bottom-right |
| bevel-bg | `#FDFEFF` → `#DCEAFB` | `#FFFDFE` → `#FBE2EE` | raised background |
| pressed | `#CFE2F8` | `#FBD3E4` | pressed or selected raised background |
| sunk-dark / sunk-inner | `#7A9CC8` / `#B9CDE8` | `#C99AB5` / `#EBCFDD` | sunken border and inner shadow |
| field | `#F2F8FF` | `#FFF7FB` | sunken field and status bar panels, sprite frames, progress track |
| panel | `#FFFFFF` | `#FFFFFF` | buddy list and inbox panels |
| me-panel | `#FFFFFF` → `#E3EFFD` | `#FFFFFF` → `#FCE6F0` | me row background (mockup) |
| selection | `#316AC5`, white text | `#C2185B`, white text | selected buddy row |
| group-text | `#173A78` | `#5A2D6E` | group header name, legends, Skin tile names (mockup) |
| text | `#1B2B4F` | `#3B2A4A` | primary text |
| text-2 | `#4E6290` | `#74647F` | secondary text, excerpts, counts, notes |
| text-on-bg | `#4E6290` | `#5A4A68` | secondary text directly on `bg` |
| line | `#E3EEFC` | `#F3E6F0` | dividers |
| box-line | `#9BB8E0` | `#E3A9C5` | group box and me row border (decorative; `line` would be 1.02 / 1.08 on `bg`) |
| tree | box border `#7A9CC8`, lines `#A9C3EA` | box border `#C99AB5`, lines `#D9C2E8` | `[−]` / `[+]` boxes and `└` marks (decorative) |
| alert-strip | `#FFF1E4`, 1 px `#FF9A4D`, text `#B4500F`, radius 0 | `#FFE8EF`, 1 px `#FF9EC4`, text `#9B1C45`, radius 0 | strip under the me row |
| count-badge | `#B84A0E`, white, 1 px `#FFFFFF`, square | `#C2185B`, white, 1 px `#FFFFFF`, square | Inbox count on the toolbar |
| unread | `N` tag: `#B84A0E`, white Galmuri9 | pixel strawberry (see Sprites) | unread marker at the row end |
| urgent-row | `#FFF4EA` + 3 px left `#FF9A4D` | `#FFF0F5` + 3 px left `#FF9EC4` | top session row in `WAITING_APPROVAL` (D12) |
| banner | stripes `#173A78` / `#1E4B96` (2 px each), border `#1F4E9A`, headline `#FFE45C`, body `#CFE8FF` | stripes `#8E1043` / `#A3205A`, border `#8E1043`, headline `#FFE45C`, body `#FFE0EE` | TIP banner |
| primary-btn | gradient `#3374D9` → `#2F6FD6`, border `#8EC2FF` top-left / `#173A78` bottom-right, white bold (4.53–4.81) | gradient `#D43A73` → `#B0174F`, border `#FFB8D6` / `#8E1043`, white bold (4.51–6.81) | `Go there ▶` |
| quiet-btn | raised, text `#173A78` | raised, text `#6B1E3F` | `Later` |
| accent | `#2F6FD6` | `#C2185B` | native checkbox and radio `accent-color` |
| hard-shadow | `2px 2px 0` `rgba(0,0,0,.25)` | `2px 2px 0` `rgba(90,45,110,.25)` | popup cards |
| focus | 2 px outline `#2F6FD6`, offset 2 | 2 px outline `#C2185B`, offset 2 | every focusable element |

Toolbar icon colors (8 × 8 icons, from the mockups): Blue Bot `#2F6FD6`, second figure `#8B7BFF`, swatch `#FFB8D2` / `#8EC2FF` framed `#173A78`; Strawberry Milk `#C2185B`, second figure `#A98BEA`, swatch `#FFB8D2` / `#8EC2FF` framed `#5A2D6E`. The second figure is below 3:1 (2.05–2.70) and allowed, because the label under the icon says the same.

### State colors (text, all at least 4.5:1 on their backgrounds)
| State | Blue Bot | Strawberry Milk |
|---|---|---|
| WAITING_APPROVAL | `#A64A0A` | `#B0174F` |
| WORKING | `#0F7A50` | `#13795B` |
| TURN_DONE | `#1A5CC0` | `#1F5FA8` |
| IDLE | `#7E5C00` | `#8A6A00` |
| STALE | `#6A4DB8` | `#5A4A68` |
| OFFLINE / ENDED | `#5E6C88` | `#5A4A68` |

### Decoration characters
| | Blue Bot | Strawberry Milk |
|---|---|---|
| working glyph (badge and phrase) | `▸` (regular weight) | `♪` |
| Go there button | `Go there ▶` | `Go there ▶` |
| title mark after `AgentBuddy` | none (robot icon + `AgentBuddy` only) | pixel strawberry |
| alert strip lead | `!` | `!` |
| relay mark in the status bar | `●` in the working color | `●` in the working color |

No `♥` or `♡` remains in Strawberry Milk. Decoration characters are never emoji and are hidden from screen readers.

## Type
- Galmuri11 (400, 700) for all UI text at 12 px. Galmuri9 at 10 px for small text: status bar, times, captions, notes, counters, badges, toolbar labels. `-webkit-font-smoothing: none` on the app root.
- Font stack: Galmuri11 (or Galmuri9), then Nanum Gothic. Korean (`띠링!`) is covered by Galmuri.
- Bundle `Galmuri11.woff2`, `Galmuri11-Bold.woff2`, `Galmuri9.woff2` and `LICENSE.txt` (OFL 1.1) from npm `galmuri` 2.40.3; record their SHA-256 in the spec. Nanum Gothic stays as the fallback with its license. Remove Jua. No runtime font fetch.
- Missing in Galmuri (cmap): `✓` and `✎` in all three files; `▸` and `−` in Galmuri11 Bold. The `✓` badge glyph, the `✎` edit mark and the `[−]` / `[+]` boxes are pixel icons; `▸` is always set in regular weight. Every other character that falls back to Nanum Gothic is listed in the spec.

## Buddy sprites (both skins)
- 12 × 12 pixel grid, drawn as inline SVG `rect`s with `shape-rendering="crispEdges"`, built with `createElementNS`. Sizes: 24 px buddy rows and inbox rows, 12 px session rows, 36 px me row and popups, 16 px title bar and Skin tiles, 28 px TIP banner.
- Body color = the agent color; the face changes with the state. Offline and ended sprites use the skin's grey, not the agent color.
- Blue Bot: rects from `FacesBot` (unchanged). Square head with side bolts and an antenna, a dark visor `#1E2A4D` with LED eyes, small body with a chest light and two feet; antenna tip, bolts and chest light take the state accent.
- Strawberry Milk: round blob, dark eyes `#3B2A4A`, pink cheeks `#FF8FB1`, and hair drawn after the body and before the face:
  - `hair` `#8A5A44`: `(3,0,6,1) (2,1,8,1) (1,2,10,1) (0,0,2,2) (10,0,2,2) (1,3,2,1) (5,3,2,1) (9,3,2,1)`
  - `hair-hi` `#B07A5E`: `(4,1,2,1)`; `clip` `#E5466B`: `(8,1,1,1) (9,2,1,1)`
  - Offline and ended: `hair` `#B9AEC4`, `hair-hi` `#CFC6D8`, no clip.
  - Faces from `FacesCute2000` (faces that touched row 3 move down one row). Turn-done mouth is a smile `(4,8,1,1) (7,8,1,1) (5,9,2,1)`.
  - In Blue Bot the roles `hair`, `hair-hi` and `clip` are `transparent`.
- Faces: needs-OK teary `T T`, working `^ ^`, turn-done star eyes, stale odd eyes, idle `- -`, offline blank (grey), ended `x x` (grey).
- Special sprites: title bar (white body, working face), `me` (me color, working face), TIP banner mascot (turn-done star eyes; body Blue Bot `#8EC2FF`, Strawberry Milk `#FFB8D2`). Rects from `MainBot2000` / `MainCute2000`.
- **State badge** at the bottom-right of buddy-row, inbox-row and popup sprites, for every state except `OFFLINE` (D2); none on session rows, the title bar, `me`, the banner or tiles (D11). 11 px on rows, 13 px on popups. Blue Bot square, Strawberry Milk circle; 1 px white border and a 1 px outline in `frame`. Fill = the skin's state text color, glyph white (D1). The badge is an HTML element over the sprite (D3); its glyph `! ▸/♪ ? z ×` comes from a token, and `✓` is a pixel icon.
- **Pixel strawberry** (8 × 8 grid, drawn at 12 px; 10 px inside banner text): green `#2E9E4F` `(2,0,1,1) (5,0,1,1) (1,1,6,1)`; red `#E5466B` `(0,2,8,1) (0,3,8,1) (0,4,8,1) (1,5,6,1) (2,6,4,1) (3,7,2,1)`; seeds `#FFE6A8` `(1,3,1,1) (5,3,1,1) (3,4,1,1) (2,5,1,1) (6,4,1,1)`. As the unread marker it is `role="img"` with `aria-label="new"`; elsewhere `aria-hidden`.
- **Toolbar icons**: 8 × 8 grid drawn at 16 px (buddies, envelope, gear, skin swatch); rects from `MainBot2000` / `MainCute2000`.

| Agent | Blue Bot | Strawberry Milk |
|---|---|---|
| Claude Code | `#6C8CFF` | `#FFC9A8` |
| Kiro | `#8B7BFF` | `#CDB8FF` |
| Codex | `#39C6E6` | `#A8EBD2` |
| me | `#2F6BFF` | `#FFB8D2` |

## Window
- 320 px wide, resizable in height (min 420 px), frameless, transparent (themes O5), radius 7 px top / 0 bottom.
- Order top to bottom: title bar, toolbar, me row (Buddies only), alert strip, the screen, TIP banner (Buddies only), status bar.
- **Title bar** (gloss): 16 px sprite, `AgentBuddy` (Blue Bot) or `AgentBuddy` + pixel strawberry (Strawberry Milk), then pin `▲`, minimize `_`, close-to-menu-bar `×` (19 × 17). Every icon-only button has an `aria-label`.
- **Toolbar**: band with four raised buttons in one row, each a 16 px icon above its Galmuri9 10 px label: `Buddies`, `Inbox`, `Settings`, `Skin`. The button of the open screen is pressed. `Inbox` carries its unread count as a square `count-badge` at its top right (hidden at 0). `Skin` opens Settings scrolled to the Skin group, and Settings shows pressed.
- Toolbar keyboard: one tab stop with a roving tabindex over all four buttons; ←/→ move focus to the previous or next button (wrapping), Home/End to the first or last; Enter or Space presses the focused button.
- **Alert strip**, shown only when the count is above 0: `! 1 needs your OK · 1 done, unread`, bold.
- **Status bar** (replaces the footer), Galmuri9 10 px `text-2`, sunken `field` panels. Buddies: `● relay connected` (dot in the working color; the existing disconnected wording otherwise), `local only`, and `on top ✓` while pinned. Inbox: `kept on this computer only`, `click a message to go there`. Settings has none.

## Status phrases
| State | Phrase |
|---|---|
| WAITING_APPROVAL | `need your OK T_T` |
| WORKING | `<glyph> working…` (Kiro in a spec task: `<glyph> studying hard`) |
| TURN_DONE | `★ done~ your turn!` |
| STALE | `? no news for a while` |
| IDLE | `brb~ zZ` |
| OFFLINE | `offline` |
| ENDED | `logged off` |

The core phrases carry no skin glyph (D10); the screen draws the working glyph before them. The phrase comes first in the state color and bold; the prompt or reply excerpt follows in `text-2` after ` · `, up to 40 code points.

## Buddy list
The 2000s messenger grammar: one line per buddy, the status message in parentheses after the name, cut with an ellipsis.

- **Me row** (Buddies only): a `me-panel` box with a 1 px `box-line` border; the 36 px `me` sprite in a sunken `field` frame; `me (online)` bold, with `(online)` regular in the working color; the user's own status message as a sunken field button that edits in place, followed by the `✎` pixel icon. Empty by default, showing `set your status ✎` in `text-2`. Enter saves, Esc cancels, max 40 code points. Stored only in `app-settings.json`; never sent to the relay or any agent.
- **List panel**: one sunken `panel` box holding every group.
- **Group header** (project folder): full-width button, no fill: `[−]` (open) or `[+]` (closed) 9 px pixel box, the folder name bold in `group-text`, then `(online/total)` in `text-2`. A buddy counts as online unless all its sessions are OFFLINE or ENDED. The offline group: `[+] offline (n)`, name in the OFFLINE color.
- **Buddy row**, one line: 24 px sprite with badge, agent name bold, `[n]` session count when more than one, then `(phrase · excerpt)` with ellipsis, then the unread marker at the right.
- **Kiro progress**: `n/m` at the right end of the line, and a sunken track on a second line indented to the name. Blue Bot: one 7 px cell per task (`n` done `#36B9F0`, then one current `#2F6FD6` while `WORKING` and `n < m`, then to-do `#E3EEFC`) on `field`; above 30 tasks one continuous bar in the same colors (D5). Strawberry Milk: a 9 px striped bar `#FFB8D2` / `#D9C2FF` filled to `n/m` on `field`. `?/?` and no track when unknown.
- **Session rows** (when expanded): indented, `└` in `tree`, 12 px sprite, `session name (phrase)` with ellipsis, relative time in Galmuri9, × button (`Hide this session`). The top session row uses `urgent-row` when it is `WAITING_APPROVAL`, otherwise only a 3 px left line in its state color (D12).
- Hidden or offline sessions: one muted line `2 logged off · show`.

## TIP banner
- 44 px strip between the screen and the status bar, Buddies only, app only (not on the relay's browser page): banner stripes and border, a 28 px mascot, a bold headline in `banner headline`, one line of body text in Galmuri9 10 px `banner body`, and a 20 × 20 `▶` button (`aria-label="Next tip"`) with a light raised border.
- The banner body is a `<button>`: clicking it runs the tip's action; a tip without an action goes to the next tip. `▶` always goes to the next tip.
- No auto-rotation. The starting tip is picked from the date: among the tips that apply when the main window first shows, number `d mod n`, where `d` is the local date's day number and `n` the number of tips that apply. Nothing is stored. After that the tip changes only on a click, to the next tip that applies, in list order.
- Tips are a constant list in `src/core`; nothing is fetched. A tip that does not apply is skipped.

| Headline | Body | Action | Shown when |
|---|---|---|---|
| `★ NEW! Blue Bot skin ★` | `try it now~ click here` + pixel strawberry | open the Skin group | skin is Strawberry Milk |
| `★ NEW! Strawberry Milk skin ★` | `try it now~ click here` | open the Skin group | skin is Blue Bot |
| `TIP ▶ click a buddy` | `to jump straight to its window~` | next tip | always |
| `Too many dings?` | `turn the sound off here` | open Settings at the Ding! sound row | Ding! sound is on |
| `n unread messages waiting!` | `click to open your inbox` | open Inbox | n > 0 (n = the Inbox count) |
| `Busy? hide old sessions` | `press × on a session row` | next tip | always |

- Settings → Banner → `Hide the TIP banner` (off by default), stored as `hideBanner` in `app-settings.json`; missing or not a boolean means `false`.

## Ding! popup
- 300 px wide card, bottom-right of the screen, newest on top, 10 px gap. 1 px border, radius 6 px top / 0 bottom, `hard-shadow`.
- Header (gloss) by kind, 17 × 15 × button:
  - needs-OK: Blue Bot `#FFC89A` → `#FF9A5C` / `#F58A4C` → `#FF9450`, text `#5A2200`, shadow `#FFE0C8`, border `frame`, × white on `#A64A0A`. Strawberry Milk `#FFD6E8` → `#FF9EC4` / `#F2709F` → `#FF8FB8`, text `#4A1A3E`, shadow `#FFE6F1`, border `frame`, × white on `#B0174F`.
  - turn-done: Blue Bot the window gloss, white text, border `frame`, × in `title-btn` style. Strawberry Milk `#EAD9FF` → `#C9A8F5` / `#A985EA` → `#BC9CF2`, text `#2E1B5C`, shadow `#F3EAFF`, border `#6F4FB8`, × white on `#5B3A9E` (8.26).
- Title: `띠링! ♪ needs your OK` / `띠링! ♪ new message`, an `<h1>` with `aria-label` `Ding! needs your OK` / `Ding! new message` (D9); time in Galmuri9 at the right; × (`Close and mark as read`).
- Body on a white-to-tint gradient (needs-OK Blue Bot `#FFF4EA`, Strawberry Milk `#FFF0F5`; turn-done Blue Bot `#EAF4FF`, Strawberry Milk `#F6F0FF`): 36 px sprite with a 13 px badge in a sunken `field` frame, `Agent` bold + `@ folder` in Galmuri9 `text-2`, the status phrase in its color, then the session name or excerpt in `text-2`.
- Buttons on both kinds (D4), on the tint: `Later` (quiet-btn) and `Go there ▶` (primary-btn). × closes and marks read, `Later` closes and keeps it unread, `Go there` and a click anywhere else on the card go there.
- Slide-up animation inside the card only; no motion under `prefers-reduced-motion`.

## Inbox
- Header line `Today · n unread` + `Mark all read` (raised button).
- The rows sit in a sunken `panel` box, one row per ding, newest first: 24 px sprite with badge, `Agent @ folder` (bold when unread), `state · session name`, time in Galmuri9, unread marker. Unread needs-OK rows use `urgent-row`.

## Settings
- Group boxes with a bold `group-text` legend and rows of `label + checkbox` (native checkboxes, `accent-color` = `accent`). Notes in Galmuri9 10 px `text-2`.
- Order: Skin, Banner, Window, When an agent needs you, Privacy, Connections.
- **Skin**: a radio group (`aria-label="Skin"`) of two raised tiles side by side, each a `<label>` with a mini window preview (frame, gloss strip, a sunken white row with a 16 px sprite and a progress bar), a native radio and the skin name. The selected tile is pressed. Note: `Changes the window and the popups at once. Saved on this computer only.`
- **Banner**: `Hide the TIP banner`, note `Tips are built in. Nothing is downloaded.`
- Window: Always on top. When an agent needs you: Ding! sound, Message popup, macOS notification too (off by default). Privacy: Hide prompt and reply text, with the note `Everything stays on this computer.`
- Connections: relay address and one dot per agent (`Codex · finished turns only` in the idle color).

## Menu bar icon
- 16 × 16 and 32 × 32 pixel art: a speech bubble (14 × 10 block with a 3 × 3 tail) and two 2 × 2 eyes, drawn in code as a macOS template image. Same for both skins.
- Count next to it = needs-OK sessions + unread turn-done sessions; hidden when 0.

## Accessibility
- The toolbar is `role="toolbar"` (`aria-label="Screens"`) with a roving tabindex; the open screen's button has `aria-current="page"`.
- Real `<button>` and `<label>` + `<input>` everywhere; the Skin tiles are native radios in a `radiogroup`; icon-only buttons have `aria-label`; sprites, badges and pixel icons are `aria-hidden` with the state name available as text to screen readers (the unread strawberry is `role="img"`, `aria-label="new"`).
- Text contrast at least 4.5:1 in both skins, including 10 px Galmuri9 text; icons, badges, markers and focus rings at least 3:1. On a gradient, every stop under the text counts. A graphic below 3:1 is allowed only when text beside it says the same, and each such pair is listed here and in the test.
- The contrast test checks every text and graphic pair in both skins, including every new pair of the brief's token table.

