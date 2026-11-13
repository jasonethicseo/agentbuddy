// Characters the UI sets as text that a bundled Galmuri file lacks (retro-skin Requirement 3.8; design "Fonts").
// Read from the files' cmap (galmuri 2.40.3, 2026-11-13) by tests/unit/font-cmap.ts; tests/unit/fonts.test.ts
// keeps this record equal to the files and to the UI's character set. Each falls back per character to Nanum Gothic.
// All three files also lack ✓ and ✎, and Galmuri11 Bold lacks −; the UI draws those three as pixel icons and never
// sets them as text. ▸ is set only in regular weight (`.lead-work`, `.badge`), so Bold's gap never reaches the screen.
export const GALMURI_MISSING = {
  /** Galmuri11 Regular, 12 px text. */
  regular: '',
  /** Galmuri11 Bold, 12 px titles, names and phrases. */
  bold: '▸',
  /** Galmuri9, 10 px small text. */
  small: '',
} as const;
