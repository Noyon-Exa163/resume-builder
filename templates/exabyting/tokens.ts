/**
 * Brand tokens for the `exabyting` resume template.
 *
 * react-pdf `StyleSheet` cannot read CSS custom properties, so this file is
 * plain JS constants and must never import `styles/tokens.css` (or any CSS).
 * App-chrome ExaDesign tokens and these print tokens are separate systems.
 *
 * The logomark is inlined as react-pdf Svg/Path in Logo.tsx (copied from
 * public/assets/Logos/Exabyting-Logomark.svg). Palette and fonts below are
 * still placeholders until the rest of the print brand kit arrives — swapping
 * those later should stay a this-file-only change.
 */

export const colors = {
  /** PLACEHOLDER — generic professional blue, not Exabyting brand. */
  brand: "#2B6CB0",
  /** PLACEHOLDER — near-black body text. */
  text: "#1A202C",
  /** PLACEHOLDER — secondary line (headline, subtitle). */
  textSecondary: "#4A5568",
  /** PLACEHOLDER — dates, contact, captions. */
  textMuted: "#718096",
  /** PLACEHOLDER — section rules and tag outlines. */
  border: "#E2E8F0",
  /** PLACEHOLDER — page background. */
  surface: "#FFFFFF",
  /** PLACEHOLDER — tag / chip fill. */
  tagBackground: "#EDF2F7",
  /** PLACEHOLDER — tag / chip label. */
  tagText: "#2D3748",
} as const;

/**
 * PLACEHOLDER typography. Helvetica is a built-in PDF font, so no
 * `Font.register()` is required. When licensed brand font files arrive,
 * change `family` (and register the font where the Document is loaded).
 */
export const fonts = {
  family: "Helvetica",
  sizeName: 20,
  sizeHeadline: 11,
  sizeSection: 10,
  sizeBody: 10,
  sizeSmall: 9,
  sizeTag: 8,
  letterSpacingSection: 1.2,
  lineHeightBody: 1.45,
  lineHeightName: 1.2,
} as const;

/** PLACEHOLDER 4pt spacing scale (react-pdf uses numeric point values). */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
} as const;

export const layout = {
  pagePaddingX: 48,
  pagePaddingY: 44,
  photoSize: 56,
  photoRadius: 4,
  /** Header logomark size (square). Keep small — resume, not a poster. */
  logoSize: 22,
  bulletMarkWidth: 10,
  sectionHeaderMinPresence: 56,
  sectionRuleHeight: 1,
  tagRadius: 2,
  tagPadX: 6,
  tagPadY: 3,
  gridCellWidth: "50%",
} as const;
