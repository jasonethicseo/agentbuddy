---
inclusion: always
---

# Design

Visual source of truth for the AgentBuddy messenger app. Reference mockups live in `docs/mockups/*.dc.html`
(HTML with inline styles; read them for exact layout, sizes, pixel art and copy; ignore the `x-dc` / `helmet` wrapper tags and the `support.js` line).
Where a mockup and the spec disagree on behavior, the spec wins. Where a mockup and this file disagree on a color, this file wins (some colors here were darkened after the mockups to pass contrast).

| Mockup | Shows |
|---|---|
| `MainBot`, `PopupBot`, `FacesBot` | Blue Bot theme (default) |
| `MainCute`, `PopupCute`, `FacesCute` | Strawberry Milk theme |
| `ThemePicker` | the Theme card in Settings |
| `Main`, `Popup`, `Inbox`, `Settings`, `Icons` | the original layout; still the reference for Inbox, Settings rows and the menu bar icon. Their colors are retired. |

## Feel
An original, cute 2000s desktop messenger. Small friendly window, rounded cards, little pixel buddies whose faces show the state, playful status lines.
Two themes share one layout and one set of words; a theme changes only colors, corner radii, the buddy sprites and a few decoration characters.
It must not copy any real messenger's or company's name, logo, mascot, icons or screens.

## Themes
- Setting `theme` in `app-settings.json`: `"blue-bot"` (default) or `"strawberry-milk"`. Theme names never mention gender.
- Implementation: every color, radius and decoration comes from CSS custom properties set on `:root[data-theme="…"]`; components never hard-code a theme color. Sprites come from one module per theme (`sprites/blue-bot.ts`, `sprites/strawberry-milk.ts`) with the same export shape.
- Switching applies at once to the main window and every open popup (IPC broadcast), no restart.
- The menu bar icon does not change with the theme (it is a macOS template image).

### Tokens
| Token | Blue Bot | Strawberry Milk | Use |
|---|---|---|---|
| bg | `#EEF6FF` + 1 px grid `#DCEBFF` every 16 px | `#FFF7FB` + 1.6 px dots `#FFDCEB` every 14 px | window background |
| frame | 3 px `#8EC2FF`, radius 16 px | 3 px `#FF9EC4`, radius 18 px | window and popup border |
| title | gradient `#A9D3FF` → `#CFE8FF`, text `#173A78`, 2 px bottom line `#8EC2FF` | gradient `#FFC2DC` → `#D9C2FF`, text `#5A2D6E`, 2 px bottom line `#FFFFFF` | title bar (left to right gradient) |
| title-btn | `#FFFFFF`, border `#8EC2FF`, glyph `#2A4C8A`, radius 6 | `#F7E9FF`, border `#FFFFFF`, glyph `#5A2D6E`, radius 11 | pin, minimize |
| close-btn | `#B84A0E`, white glyph | `#C2185B`, white glyph | close-to-menu-bar |
| card | `#FFFFFF`, 1 px `#CFE3FF`, shadow `0 3px 0 #D3E4F8`, radius 12 | `#FFFFFF`, no border, shadow `0 2px 0 #F3C6DA`, radius 14 | me row, list body, settings cards, popups |
| group | `#E3F0FF`, text `#2A4C8A`, radius 8 | `#F1E9FF`, text `#4A2A5E`, radius 10 | group header, idle tab, small buttons |
| text | `#1B2B4F` | `#3B2A4A` | primary text |
| text-2 | `#4E6290` | `#74647F` | secondary text, excerpts |
| text-on-bg | `#4E6290` | `#5A4A68` | secondary text sitting directly on the window background (footer); Strawberry Milk's `text-2` falls to 4.31:1 on its pattern dots |
| line | `#E3EEFC` | `#F3E6F0` | dividers |
| tree | `#A9C3EA` | `#D9C2E8` | `┗` marks (decorative, aria-hidden) |
| alert-strip | `#FFF1E4`, 2 px dashed `#FF9A4D`, text `#B4500F`, radius 10 | `#FFE8EF`, 2 px dashed `#FF9EC4`, text `#9B1C45`, radius 20 | strip under the title bar |
| tab-active | `#2F6FD6`, border `#1F5BB8`, white text, radius 8 | `#FFFFFF`, border `#FF9EC4`, text `#3B2A4A`, radius 14 | active tab |
| count-badge | `#B84A0E`, white, radius 4 | `#C2185B`, white, radius 8 | Inbox count |
| unread | `N` tag: `#B84A0E`, white 9 px bold, radius 3 | `♥` in `#E5466B` | unread marker at the row end |
| urgent-row | `#FFF4EA` + 3 px left `#FF9A4D` | `#FFF0F5` + 3 px left `#FF9EC4` | most urgent session row |
| primary-btn | `#2F6FD6`, 2 px `#FFFFFF` border, shadow `0 3px 0 #2563C9` | `#C2185B`, 2 px `#FFFFFF` border, shadow `0 2px 0 #8E1043` | `Go there` |
| quiet-btn | `#F2F8FF`, 2 px `#CFE3FF`, text `#2A4C8A` | `#FFF7FB`, 2 px `#F3C6DA`, text `#6B1E3F` | `Later` |
| focus | 2 px outline `#2F6FD6`, offset 2 | 2 px outline `#C2185B`, offset 2 | every focusable element |

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
| working glyph (badge and phrase) | `▸` | `♪` |
| Go there button | `Go there ▶` | `Go there ♥` |
| app title mark | `AgentBuddy ▸` | `AgentBuddy ♡` |

## Type
- Titles, names, tabs, buttons: Jua 13–17 px. Text: Nanum Gothic 12 px (11 px for secondary lines), bold 700–800 for emphasis.
- Bundle both font files with their OFL licenses; no runtime font fetch. Drop Silkscreen.

## Buddy sprites (both themes)
- 12 × 12 pixel grid, drawn as inline SVG `rect`s with `shape-rendering="crispEdges"`. Sizes: 26 px in buddy rows, 16 px in session rows, 34 px in the me row, 44 px in popups.
- Copy the exact rects from `FacesBot` / `FacesCute`. Body color = the agent color; the face changes with the state.
- Blue Bot body: square head with side bolts and an antenna, a dark visor `#1E2A4D` with LED eyes, small body with a chest light and two feet. Antenna tip, bolts and chest light take the state accent.
- Strawberry Milk body: round blob, dark eyes `#3B2A4A`, pink cheeks `#FF8FB1`.
- Faces: needs-OK teary `T T`, working `^ ^`, turn-done star eyes, stale odd eyes, idle `- -`, offline blank (grey), ended `x x` (grey). Offline and ended sprites use the theme's grey, not the agent color.
- A small state badge sits at the bottom-right of every sprite except offline (Blue Bot: rounded square; Strawberry Milk: circle) with a glyph `! ▸/♪ ✓ ? z ×`, so the state never depends on color alone. Badge fill = the theme's state text color (State colors table), glyph white, 1.5 px white border. The badge is an HTML element over the sprite, so its glyph comes from a token; `✓` is a text character.

| Agent | Blue Bot | Strawberry Milk |
|---|---|---|
| Claude Code | `#6C8CFF` | `#FFC9A8` |
| Kiro | `#8B7BFF` | `#CDB8FF` |
| Codex | `#39C6E6` | `#A8EBD2` |
| me | `#2F6BFF` | `#FFB8D2` |

## Window frame
- Window: 320 px wide, resizable in height (min 420 px), frameless, all four corners at the theme radius.
- Rounded corners need a transparent `BrowserWindow`. If a transparent window cannot be resized on the user's macOS, keep it opaque with square corners and the same colors; record which one shipped in the spec.
- Title bar: sprite icon + `AgentBuddy` + title mark, then pin, minimize, close-to-menu-bar (22 × 22). Every icon-only button has an `aria-label`.
- Alert strip under the title bar, shown only when count > 0, e.g. `! 1 needs your OK · 1 done, unread`.
- Tabs: `Buddies | Inbox (n) | Settings` as separate rounded buttons.
- Footer, 11 px `text-on-bg`: relay mark (Blue Bot a square dot, Strawberry Milk `♥`, in the working color when connected) + `relay connected · local only`, and `on top ✓` when pinned.

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

The phrase comes first in the state color and bold; the prompt or reply excerpt follows in `text-2` after ` · `, up to 40 code points. Decoration characters only, never emoji.

## Buddy list
The 2000s messenger grammar: one line per buddy, the status message in parentheses after the name, cut with an ellipsis.

- **My status row** (top, Buddies tab only): `me` sprite 34 px, `me` in Jua, and the user's own status message in `text-2` as a button that edits in place. Empty by default, showing `set your status ✎` in `text-2`. Enter saves, Esc cancels, max 40 code points. Stored only in `app-settings.json`; never sent to the relay or any agent.
- Group header (project folder): full-width button, `▼ name (online/total online)` / `▶`; counts in Nanum Gothic `text-2`. A buddy counts as online unless all its sessions are OFFLINE or ENDED.
- Buddy row, one line: sprite with badge, agent name, `[n]` session count when more than one, then `(phrase · excerpt)` with ellipsis, then the unread marker at the right.
- Kiro progress: `n/m` at the right end of the line, and a bar on a second line indented to the name. Blue Bot: one 6 px cell per task (`m` cells: `n` done, then one current cell while working, then todo), done `#36B9F0`, current `#2F6FD6`, todo `#D6E6FA`, 2 px frame `#BFD8FF` on `#F2F8FF`; above 30 tasks one continuous bar in the same colors. Strawberry Milk: 10 px rounded bar, stripes `#FFB8D2` / `#D9C2FF` on `#FBF6FE`, frame `#E7D5F2`.
- Session rows (when expanded): indented, tree mark, 16 px sprite, `session name (phrase)` with ellipsis, relative time, × button (`Hide this session`). The most urgent session row uses `urgent-row`.
- Hidden or offline sessions: one muted line `2 logged off · show`.
- `▶ offline (n)` group collects buddies whose every session is offline or ended.

## Ding! popup
- 300 px wide card, bottom-right of the screen, newest on top, 10 px gap; frame and radius from the theme.
- Header by kind:
  - needs-OK: Blue Bot gradient `#FFD3AE` → `#FFE6CC`, text `#8A3A06`, border `#FF9A4D`. Strawberry Milk gradient `#FFC2DC` → `#FFD9C2`, text `#6B1E3F`, border `#FF9EC4`.
  - turn-done: the theme's title gradient and frame. Strawberry Milk uses `#D9C2FF` → `#C2E3FF`, text `#3D2A6B`, border `#C9B2F5`. Its × uses the theme's title-btn style (white glyph on `#A98BEA` is only 2.77:1).
- Title: `띠링! ♪ needs your OK` / `띠링! ♪ new message` in Jua 14 px, with `aria-label` so screen readers say `Ding!`; time at the right, × button (`Close and mark as read`).
- Body: 44 px sprite with badge, `Agent @ folder`, status phrase in its color, then the session name or excerpt in `text-2`.
- Buttons on both kinds: `Later` (quiet-btn) and `Go there` (primary-btn). × closes and marks read, `Later` closes and keeps it unread, `Go there` and a click anywhere else on the card go there (behavior unchanged from the messenger-app spec).
- Slide-up animation inside the card only; no motion under `prefers-reduced-motion`.

## Inbox
- Header line `Today · n unread` + `Mark all read` button.
- One row per ding, newest first: sprite, `Agent @ folder` (bold when unread), `state · session name`, time, unread marker. Unread needs-OK rows use `urgent-row`.
- Footer: `kept on this computer only · click a message to go there`.

## Settings
- Cards (theme `card`) with a Jua title and rows of `label + checkbox` (native checkboxes, `accent-color` = the theme's primary-btn color, 16 px).
- **Theme** card first: a radio group of two preview tiles (mini window in that theme + name), `Blue Bot` and `Strawberry Milk`; the selected tile gets a 2 px primary border and a check. Note: `Changes the window and the popups at once. Saved on this computer only.`
- Window: Always on top. When an agent needs you: Ding! sound, Message popup, macOS notification too (off by default). Privacy: Hide prompt and reply text, with the note `Everything stays on this computer.`
- Connections card: relay address and one dot per agent (`Codex · finished turns only` in the idle color).

## Menu bar icon
- 16 × 16 and 32 × 32 pixel art: a speech bubble (14 × 10 block with a 3 × 3 tail) and two 2 × 2 eyes, drawn in code as a macOS template image. Same for both themes.
- Count next to it = needs-OK sessions + unread turn-done sessions; hidden when 0.

## Accessibility
- Real `<button>` and `<label>` + `<input>` everywhere; the theme tiles are `role="radio"` in a `radiogroup`; icon-only buttons have `aria-label`; sprites and badges are `aria-hidden` with the state name available as text to screen readers.
- Text contrast at least 4.5:1 in both themes, including 11 px secondary text; icons and badges at least 3:1. Add a test that checks every text token pair in both themes.
