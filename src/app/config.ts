// Constants of the desktop app's main process (messenger-app design, `src/app/config.ts`).

/** Wait between attempts to reach a relay. */
export const RETRY_MS = 3000;
/** A program on the port must send a `buddies` list this soon after connecting, else it is not a relay. */
export const FIRST_LIST_MS = 5000;
/** No bytes at all for this long (the relay sends a heartbeat every 25 s) means the stream is dead. */
export const STALL_MS = 60_000;
/** A jump command (`lsappinfo`, `open`) is stopped after this long. */
export const JUMP_TIMEOUT_MS = 3000;
/** A pop-up closes by itself after this long. */
export const POPUP_MS = 6000;
/** A notice in the main window's footer shows this long. */
export const NOTICE_MS = 4000;
/** Settings changes within this time are saved once. */
export const SAVE_DELAY_MS = 500;
/** Re-check time-based state, hidden marks and the day. */
export const TICK_MS = 30_000;

/**
 * Pop-up card from `PopupBot.dc.html` / `PopupCute.dc.html`: 3 px border, 30 px header, 62 px body,
 * 40 px buttons, 3 px border, 4 px shadow, plus 2 px (themes design "window-options.ts, config.ts").
 */
export const POPUP = { width: 300, height: 144, gap: 10, margin: 12 } as const;
/**
 * The main window's frame (themes Requirement 8): `transparent` because O5 (2026-11-13) showed a
 * transparent frameless window still resizes in height, so the page draws the theme's round corners.
 */
export const MAIN_FRAME: 'transparent' | 'opaque' = 'transparent';
/** Main window from design.md: 320 px wide, height changeable, at least 420 px. */
export const MAIN = { width: 320, height: 620, minHeight: 420, margin: 12 } as const;
