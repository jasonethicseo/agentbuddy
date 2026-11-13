// Characters the UI can show that a bundled Galmuri file lacks (retro-skin Requirement 3.8; design "Fonts").
// Read from the files' cmap on 2026-11-13 (galmuri 2.40.3) by tests/unit/font-cmap.ts; tests/unit/fonts.test.ts
// keeps this record equal to the files. Each falls back per character to Nanum Gothic, then the system font.
// Galmuri11 Bold also lacks U+2212 (−), which the UI never sets as text: the group boxes are pixel icons.
// ✓ and ✎ are drawn as pixel icons, and ▸ is set in regular weight, so in practice nothing here reaches the screen.
export const GALMURI_MISSING = {
  /** Galmuri11 Regular, 12 px text. */
  regular: '✓✎',
  /** Galmuri11 Bold, 12 px titles, names and phrases. */
  bold: '✓✎▸',
  /** Galmuri9, 10 px small text. */
  small: '✓✎',
} as const;
