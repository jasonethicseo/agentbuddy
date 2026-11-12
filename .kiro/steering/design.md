---
inclusion: always
---

# Design

Visual source of truth for the AgentBuddy messenger app. Reference mockups live in `docs/mockups/*.dc.html`
(HTML with inline styles; read them for exact layout, sizes and copy; ignore the `x-dc` / `sc-*` wrapper tags and the `support.js` line).
Where a mockup and the spec disagree on behavior, the spec wins; this file decides the look.

## Feel
An original "Y2K messenger": a small, friendly desktop window from the early 2000s.
Sky-blue glossy title bar, light body, small pixel touches, playful status lines.
It must not copy any real messenger's name, logo, icons, colors-as-brand or screens.

## Window frame
- Window: 320 px wide, resizable in height (min 420 px). 3 px `#1D5FB8` border, radius 10 px on top, 4 px at the bottom.
- Title bar: vertical gradient `#4A9BEA` → `#1D5FB8`, white text. Left: 16 px pixel bubble icon + `AgentBuddy` in Silkscreen 13 px. Right: small square buttons (22×20, radius 3): pin on top, minimize, close-to-menu-bar (close button `#D9541E`). Every icon-only button has an `aria-label`.
- Alert strip under the title bar, shown only when count > 0: background `#FFF3E6`, border `#F3C99B`, text `#8A3C00` bold, e.g. `1 needs your OK · 1 done, unread`.
- Tabs: `Buddies | Inbox (n) | Settings` on a `#DDE9F7` band. Active tab joins the body (`#F4F8FD`, no bottom border, bold). Inbox badge: `#D9541E` pill with white count.
- Footer bar: `#DDE9F7`, 11 px: relay status dot (green `#2E9E4F` connected) + `relay connected · local only`, and `on top ✓` when pinned.

## Palette
| Token | Hex | Use |
|---|---|---|
| frame | `#1D5FB8` | window border, primary button |
| title-top | `#4A9BEA` | title gradient top |
| body | `#F4F8FD` | window background |
| row | `#FFFFFF` | buddy and session rows |
| group | `#E8F0FA` | group header background, text `#1B3A66` |
| band | `#DDE9F7` | tab band, footer |
| line | `#C9DBF0` / `#EEF3F9` | dividers |
| text | `#1B2433` | primary text |
| text-2 | `#4E5B6E` | secondary text (passes 4.5:1 on body and row) |
| alert | `#D9541E` | needs-OK icon, unread dot, badges, alert popup |
| alert-text | `#8A3C00` | needs-OK status text |
| ok | `#2E9E4F` | working icon, connected dot; text `#1E6B35` |
| done | `#2F6FDE` | turn-done icon; text `#1D4FA8` |
| idle | `#B8860B` | idle icon |
| muted | `#6E7A8C` / `#8C99AA` | stale icon / offline and ended rings |

No other colors. Flat fills except the two title-bar gradients.

## Type
- Text: Nanum Gothic 12 px (bundle the font file with its OFL license; no runtime font fetch). Bold 800 for names, 700 for status emphasis.
- Titles and popup headers: Silkscreen 11–13 px (bundle with its OFL license). Latin only; Korean always uses Nanum Gothic.

## Status icons (inline SVG, 14 px in rows, 28 px in popups)
Each state differs by shape or glyph, not only color.
| State | Icon | Status phrase |
|---|---|---|
| WAITING_APPROVAL | alert circle with `!` | `need your OK T_T` |
| WORKING | ok circle with `♪` | `♪ working…` (Kiro in a spec task: `♪ studying hard`) |
| TURN_DONE | done circle with a check | `★ done~ your turn!` |
| STALE | muted circle with `?` | `? no news for a while` |
| IDLE | idle crescent | `brb~ zZ` |
| OFFLINE | muted ring | `offline` |
| ENDED | muted ring with × | `logged off` |

The phrase comes first in the state color; the prompt or reply excerpt follows in `text-2` after ` · `, up to 40 code points.

## Buddy list
The 2000s messenger grammar: one line per buddy, the status message in parentheses after the name, cut with an ellipsis.

- **My status row** (top, under the title bar): 34 px avatar tile (the pixel bubble on `#EAF2FC`), `me` bold, and the user's own status message in `text-2` as a button that opens an inline edit (e.g. `★ building AgentBuddy ♪ ✎`). Stored locally. Optional feature: if it is cut for time, drop the row and keep the rest.
- Group header (project folder): full-width button, `▼ name (online/total online)` / `▶`, `group` background, bold; counts in normal weight `text-2`. A buddy counts as online unless all its sessions are OFFLINE or ENDED.
- Buddy row, one line: icon, agent name bold, `[n]` session count when more than one, then `(phrase · excerpt)` in `text-2` with the phrase in its state color and bold, single line with `text-overflow: ellipsis`, then the unread dot (8 px `alert`) at the right.
- Kiro progress: `n/m` at the right end of the line, and an 8 px bar on a second line indented 20 px (border `#8FB8E6`, track `#EAF2FC`, fill striped `#4A9BEA`/`#2F78D0`).
- Session rows (when expanded): indented, tree marks `├` / `└` in `#8C99AA`, small icon, `session name (phrase)` on one line with ellipsis, relative time, × button (`Hide this session`). The most urgent session row gets a 3 px left border in its state color and a tinted background (`#FFF8F1` for needs-OK).
- Status phrases may carry the era's decoration characters (`♪ ★ ~ T_T zZ`). Never emoji.
- Hidden or offline sessions: one muted line `2 logged off · show`.
- `▶ offline (n)` group collects buddies whose every session is offline or ended.

## Ding! popup
- 300 px wide card, bottom-right of the screen, newest on top, 10 px gap.
- Border 2 px and title gradient in the state color: needs-OK uses `#F59A4E` → `#D9541E`; turn-done uses the window blue gradient.
- Title: `Ding! ♪ needs your OK` / `Ding! ♪ new message` in Silkscreen 11 px, time at the right, × button.
- Body: 28 px status icon, `Agent @ folder` bold, status phrase in its color, then the session name or excerpt in `text-2`.
- Buttons: `Later` (quiet) and `Go there →` (filled in the state color). Clicking anywhere on the card except × also means Go there.
- Slide-up animation inside the card only; no motion under `prefers-reduced-motion`.

## Inbox
- Header line `Today · n unread` + `Mark all read` button.
- One row per ding, newest first: icon, `Agent @ folder` (bold when unread), `state · session name`, time, unread dot. Unread rows have a tinted background (`#FFF8F1` for needs-OK, `#F7FAFE` for done).
- Footer: `kept on this computer only · click a message to go there`.

## Settings
- Cards with a bold title and rows of `label + checkbox` (native checkboxes, `accent-color: #1D5FB8`, 16 px).
- Window: Always on top. When an agent needs you: Ding! sound, Message popup, macOS notification too (off by default). Privacy: Hide prompt and reply text, with the note `Everything stays on this computer.`
- Connections card: relay address and one dot per agent (`Codex · finished turns only` in the idle color).

## Menu bar icon
- 16 × 16 and 32 × 32 pixel art: a speech bubble (14 × 10 block with a 3 × 3 tail) and two 2 × 2 eyes, drawn in code as a macOS template image.
- Count next to it = needs-OK sessions + unread turn-done sessions; hidden when 0.

## Accessibility
- Real `<button>` and `<label>` + `<input>` everywhere; icon-only buttons have `aria-label`; status icons are `aria-hidden` with the state name available as text to screen readers.
- Text contrast at least 4.5:1, including 11 px secondary text.
