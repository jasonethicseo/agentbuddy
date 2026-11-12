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

/** Pop-up card from `Popup.dc.html`: 26 px title, about 70 px body, 36 px buttons, 2 px border. */
export const POPUP = { width: 300, height: 136, gap: 10, margin: 12 } as const;
/** Main window from design.md: 320 px wide, height changeable, at least 420 px. */
export const MAIN = { width: 320, height: 620, minHeight: 420, margin: 12 } as const;
