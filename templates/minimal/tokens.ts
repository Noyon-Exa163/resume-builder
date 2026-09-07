/**
 * Brand tokens for the `minimal` resume template — plain JS constants, same
 * reasoning as templates/exabyting/tokens.ts: react-pdf `StyleSheet` cannot
 * read CSS custom properties, and this file must never import styles/tokens.css.
 * Deliberately its own values, not a copy of exabyting/tokens.ts — the point
 * of a second template is proving the registry supports genuinely independent
 * templates, not just a re-skin.
 */

export const colors = {
  text: "#111111",
  textSecondary: "#4b4b4b",
  textMuted: "#6f6f6f",
  rule: "#111111",
  surface: "#FFFFFF",
} as const;

export const fonts = {
  family: "Helvetica",
  sizeName: 22,
  sizeHeadline: 11,
  sizeSection: 10,
  sizeBody: 10,
  sizeSmall: 9,
  letterSpacingSection: 2,
  lineHeightBody: 1.4,
  lineHeightName: 1.15,
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 28,
} as const;

export const layout = {
  pagePaddingX: 52,
  pagePaddingY: 48,
  sectionRuleHeight: 1,
  bulletMarkWidth: 10,
  sectionHeaderMinPresence: 56,
} as const;
