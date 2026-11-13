# retro-skin brief

Input for the `retro-skin` spec. It changes the **materials** of both skins so the app reads as a 2000s desktop messenger at a glance, renames "Theme" to "Skin", replaces the tabs with a toolbar, and adds one small feature: the TIP banner.
Everything the `themes` spec built stays: `themes.css` as the only color file, the `theme` setting, live switching, sprite modules by role, the badge rules, the contrast tests, and every behavior decision (popup buttons on both kinds, urgent-row rules, `<h1>` popup title, phrases without decoration characters).

Mockups (in `docs/mockups/`):

| Mockup | Shows |
|---|---|
| `MainBot2000`, `PopupBot2000` | Blue Bot, 2000s materials |
| `MainCute2000`, `PopupCute2000`, `FacesCute2000` | Strawberry Milk, 2000s materials, buddies with hair |
| `SkinPicker2000` | Settings: Skin group and Banner group |

The mockups load Galmuri from the design canvas (`/_blob/...` URLs); those URLs do not work in the repo, so read them for layout, sizes, colors and copy. Where this brief and a mockup disagree, this brief wins.

## 1. Materials (both skins)

| Element | Rule |
|---|---|
| Font | Galmuri11 (400, 700) for all UI text at 12 px; Galmuri9 at 10 px for small text (status bar, times, captions, counters). Bundle the woff2 files with `LICENSE.txt` (OFL 1.1) from npm `galmuri` 2.40.3. Remove Jua. Set `-webkit-font-smoothing: none` on the app root. Korean (`띠링!`) is covered by Galmuri. |
| Window | 1 px outer border in `frame`, 1 px inner highlight line, radius 7 px top / 0 bottom. No soft shadows anywhere. |
| Title bar | "gloss": a vertical gradient with a hard stop at 48/52 % plus a 1 px top highlight. Title text bold with a 1 px text-shadow in `title-shadow`. Title buttons 19 × 17, radius 3, 1 px white border, small vertical gradient. |
| Raised ("bevel") | 1 px border, light top-left (`#FFFFFF`), dark bottom-right (`bevel-dark`), background a light vertical gradient. Used for toolbar buttons, `Later`, picker tiles, face cards. Pressed/selected: the two border colors swap and the background becomes `pressed`. |
| Sunken | 1 px border, dark top-left (`sunk-dark`), white bottom-right, plus a 1 px inner shadow. Used for the buddy list panel, the status message field, avatar frames, the progress track and status-bar panels. |
| Group box | Settings cards become `<fieldset>` + `<legend>` with a 1 px `line` border, radius 3. |
| Selection | The buddy row that has keyboard focus or was last clicked uses the `selection` fill with all its text in white (status colors are dropped inside it). |

## 2. Tokens

Add or replace these in `themes.css`. Tokens not listed keep their `themes` values (state text colors, agent colors, urgent-row, alert colors).

| Token | Blue Bot | Strawberry Milk |
|---|---|---|
| bg | `#E6F0FC` | `#FDEFF5` |
| frame | `#1F4E9A`, inner line `#A9D3FF` | `#B0326A`, inner line `#FFC2DC` |
| gloss | `#2B6FD0` → `#2766C8` 48 % / `#1E5BBE` 52 % → `#2563C6`, top line `#8CC8FF` | `#FFD6E8` → `#FFA6CB` 48 % / `#F57FB2` 52 % → `#FF96C2` |
| title-text / title-shadow | `#FFFFFF` / `#1D4E9A` | `#4A1A3E` / `#FFE6F1` |
| title-btn | gradient `#7DB8FF` → `#3A7FD8`, white glyph | gradient `#FFB8D6` → `#E5679E`, white glyph |
| close-btn | gradient `#F08A5A` → `#C8461A` | gradient `#E0457F` → `#A3124A` |
| toolbar band | `#D6E6FA`, bottom line `#9BB8E0` | `#FBDCEA`, bottom line `#E3A9C5` |
| bevel-dark | `#5C7FB0` | `#C77BA0` |
| bevel-bg | `#FDFEFF` → `#DCEAFB` | `#FFFDFE` → `#FBE2EE` |
| pressed | `#CFE2F8` | `#FBD3E4` |
| sunk-dark / sunk-inner | `#7A9CC8` / `#B9CDE8` | `#C99AB5` / `#EBCFDD` |
| field | `#F2F8FF` | `#FFF7FB` |
| selection | `#316AC5` | `#C2185B` |
| tree | box border `#7A9CC8`, lines `#A9C3EA` | box border `#C99AB5`, lines `#D9C2E8` |
| banner | stripes `#173A78` / `#1E4B96`, border `#1F4E9A`, headline `#FFE45C`, body `#CFE8FF` | stripes `#8E1043` / `#A3205A`, border `#8E1043`, headline `#FFE45C`, body `#FFE0EE` |
| popup needs-OK header | gloss `#FFC89A` → `#FF9A5C` / `#F58A4C` → `#FF9450`, text `#5A2200`, shadow `#FFE0C8` | gloss `#FFD6E8` → `#FF9EC4` / `#F2709F` → `#FF8FB8`, text `#4A1A3E`, shadow `#FFE6F1` |
| popup turn-done header | the window gloss, white text | gloss `#EAD9FF` → `#C9A8F5` / `#A985EA` → `#BC9CF2`, text `#2E1B5C`, shadow `#F3EAFF` |
| primary-btn | gradient `#5AA6F0` → `#2F6FD6`, border `#8EC2FF` / `#173A78`, white bold | gradient `#E0457F` → `#B0174F`, border `#FFB8D6` / `#8E1043`, white bold |

Contrast, measured on the flat colors (gradients: on the lightest stop under the text):
- White on Blue Bot gloss stops 4.90–6.37; `#4A1A3E` on Strawberry gloss 5.68–10.63; needs-OK popup text 4.54–8.40 (`#F58A4C` stop is the lowest); lavender header text 5.06–11.12.
- White on selection: 5.25 (Blue Bot), 5.87 (Strawberry Milk).
- `text-2` on bg: 5.25 (Blue Bot), 4.87 (Strawberry Milk). Banner body text 6.65 / 5.89.
- Add every new pair to the contrast test.

## 3. Layout changes

- **Toolbar replaces the tabs**: four bevel buttons in a row (`Buddies`, `Inbox`, `Settings`, `Skin`), each a 16 px pixel icon above an 11 px label. The active one is pressed. Inbox shows its count as a small square badge at the top right. `Skin` opens Settings scrolled to the Skin group. Same keyboard behavior as the current tabs.
- **Me row**: a panel with a light gradient and a 1 px `line` border; the 36 px sprite sits in a sunken frame; the status message is a sunken field. `me (online)` with `(online)` in the working color.
- **Buddy list**: one sunken white panel. Group headers are `[−]` / `[+]` 9 px boxes + bold folder name + `(online/total)` in `text-2`, no fill. Rows keep their content and order; buddy sprites 24 px; session sprites 12 px; tree mark `└`.
- **Kiro progress**: inside a sunken track. Blue Bot keeps the cells (done `#36B9F0`, current `#2F6FD6`, todo `#E3EEFC`); Strawberry Milk keeps the striped bar.
- **Status bar** replaces the footer: three sunken panels in Galmuri9 10 px: `● relay connected` (dot in working color), `local only`, `on top ✓` (only when pinned).
- **Popups**: same content and buttons as now; header uses the popup gloss; the sprite sits in a sunken frame; buttons are bevel (`Later`) and primary (`Go there ▶`, both skins). Hard 2 px offset shadow instead of a blur.

## 4. Sprites and icons

- **Strawberry Milk buddies get hair.** Add these rects after the body and before the face (12 × 12 grid). Role `hair` = `#8A5A44`, role `hair-hi` = `#B07A5E`, role `clip` = `#E5466B`. Offline/ended: `hair` `#B9AEC4`, `hair-hi` `#CFC6D8`, no clip.
  - hair: `(3,0,6,1) (2,1,8,1) (1,2,10,1) (0,0,2,2) (10,0,2,2) (1,3,2,1) (5,3,2,1) (9,3,2,1)`
  - hair-hi: `(4,1,2,1)`
  - clip: `(8,1,1,1) (9,2,1,1)`
  - Faces move down one row where they touched row 3; copy them from `FacesCute2000`. The turn-done mouth becomes a smile `(4,8,1,1) (7,8,1,1) (5,9,2,1)`.
  - Blue Bot does not use these roles; set them to `transparent` there so both skins keep the same token set.
- **Unread marker, Strawberry Milk**: a pixel strawberry (8 × 8 grid, drawn at 12 px) instead of `♥`, `role="img"` with `aria-label="new"`. Rects: green `#2E9E4F` `(2,0,1,1) (5,0,1,1) (1,1,6,1)`; red `#E5466B` `(0,2,8,1) (0,3,8,1) (0,4,8,1) (1,5,6,1) (2,6,4,1) (3,7,2,1)`; seeds `#FFE6A8` `(1,3,1,1) (5,3,1,1) (3,4,1,1) (2,5,1,1) (6,4,1,1)`. The same strawberry follows the title (`AgentBuddy` + strawberry) and appears in banner text. No `♥` or `♡` remains in Strawberry Milk.
- **Blue Bot unread** stays the `N` tag.
- **Toolbar icons**: 8 × 8 pixel icons drawn at 16 px (buddies, envelope, gear, skin swatch); copy rects from the mockups.
- **Glyph coverage in Galmuri** (checked with the cmap): `✓` and `✎` are missing in all three files; `▸` and `−` are missing in Galmuri11 Bold. Draw the `✓` badge and the `✎` edit mark as pixel icons, render `▸` in regular weight, and draw the tree `[−]` box as a pixel icon. Keep the Nanum Gothic fallback for anything else and record which characters fall back.

## 5. TIP banner (new feature)

- A 44 px strip above the status bar: a 28 px sprite (the skin's mascot with star eyes), a headline (bold, `banner headline`) and one line of body text (Galmuri9 10 px), and a small `▶` button (`aria-label="Next tip"`).
- **Clicking the banner** runs the tip's action; a tip without an action goes to the next tip. **`▶`** always goes to the next tip. Both are real `<button>`s.
- **No auto-rotation.** One tip is picked when the app starts (deterministic order, continuing from the last one shown), and it changes only when the user clicks.
- **Built-in tips only**, as a constant list in core; nothing is fetched. Tips that point at something that does not apply (for example the unread tip when nothing is unread) are skipped.
- **Settings → Banner → `Hide the TIP banner`** (off by default), stored in `app-settings.json` as `hideBanner`. Missing or invalid value → `false`.
- Starting tips (headline · body → action):

| Headline | Body | Action |
|---|---|---|
| `★ NEW! Blue Bot skin ★` (shown only in Strawberry Milk) | `try it now~ click here` | open the Skin group |
| `★ NEW! Strawberry Milk skin ★` (shown only in Blue Bot) | `try it now~ click here` | open the Skin group |
| `TIP ▶ double-click a buddy` | `to jump straight to its window~` | none (next tip) |
| `Too many dings?` | `turn the sound off here` | open Settings at the sound row |
| `n unread messages waiting!` | `click to open your inbox` | open Inbox (only when n > 0) |
| `Busy? hide old sessions` | `press × on a session row` | none (next tip) |

## 6. Rename

- Every user-facing "Theme" becomes "Skin" (Settings group, toolbar, aria labels, README). The setting key stays `theme` so existing `app-settings.json` files need no migration.

## 7. Out of scope

- Real ad content, network calls, auto-rotating banners, sound changes, new skins, menu bar icon changes.
- Copying any real messenger's or operating system's name, logo, wallpaper, icons, sounds or screens. The materials above are generic conventions of that era.
