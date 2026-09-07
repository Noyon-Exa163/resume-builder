/**
 * Brand tokens for the `exabyting` resume template.
 *
 * react-pdf `StyleSheet` cannot read CSS custom properties, so this file is
 * plain JS constants and must never import `styles/tokens.css` (or any CSS).
 * App-chrome ExaDesign tokens and these print tokens are separate systems.
 *
 * The vertical full logo is inlined as react-pdf Svg/Path in Logo.tsx (copied
 * from public/assets/Logos/Exa-Logo-Full_Vertical.svg).
 */

export const colors = {
  /** exa.5 — top accent bar and section accents. */
  brand: "#0072ED",
  /** exa.1 — logo container background. */
  brandSubtle: "#f0f5fe",
  /** Logo mark paths from Exa-Logo-Full_Vertical.svg. */
  logoMark: "#008DFF",
  /** Logo wordmark paths from Exa-Logo-Full_Vertical.svg. */
  logoWordmark: "#08061D",
  text: "#010515",
  textSecondary: "#45556c",
  textMuted: "#8697ad",
  border: "#e4e4e4",
  /** grey.4 — quieter rules, e.g. contact column dividers. */
  borderMuted: "#f2f2f2",
  surface: "#FFFFFF",
  tagBackground: "#f0f5fe",
  tagText: "#032468",
} as const;

/**
 * Registered in ../fonts.ts. Gilroy is titles (name, section, entry, skill
 * labels); Inter is everything else. letterSpacing is in points — react-pdf
 * cannot read CSS `em` tokens — mapped from the app-chrome tracking scale:
 * name −0.015em at 20pt, section labels keep overline-style open tracking.
 */
export const fonts = {
  family: "Inter",
  display: "Gilroy",
  sizeName: 20,
  sizeHeadline: 11,
  sizeSection: 10,
  sizeBody: 10,
  sizeSmall: 9,
  sizeTag: 8,
  letterSpacingName: -0.3,
  letterSpacingHeadline: 0,
  letterSpacingSection: 1.2,
  letterSpacingEntryTitle: 0,
  lineHeightBody: 1.45,
  lineHeightName: 1.2,
  lineHeightHeadline: 1.3,
  lineHeightSection: 1.25,
  /**
   * Chips size their box from the line height, so body leading would hang as
   * dead space under the label. 1 keeps the padding even top and bottom.
   */
  lineHeightTag: 1,
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
  /** Full-bleed top accent bar — edge to edge, flush with page top. */
  topBarHeight: 4,
  /** Inset from page top to name/body — below the fixed bar. */
  contentInsetBelowTopBar: 40,
  photoSize: 56,
  photoRadius: 4,
  /** Vertical full logo render height in the header container. */
  logoHeight: 32,
  /** SVG width at `logoHeight` (viewBox 75×40). */
  logoWidth: 60,
  logoContainerPadX: 24,
  logoContainerPadY: 24,
  /** Reserved header column so contact text cannot paint over the logo. */
  logoColumnWidth: 108,
  /** Gap between the contact table and the logo column. */
  headerLogoGap: 16,
  /** Filled exa.1 circle around each brand-blue contact glyph. */
  contactBadgeSize: 18,
  contactGlyphSize: 9,
  /**
   * Share of the contact table given to the phone column when one exists.
   * Remaining width is split among however many other columns the grid used.
   */
  contactPhoneColumnShare: 0.28,
  bulletMarkWidth: 10,
  /**
   * Keep an entry title with the first line of its body. Used on flattened
   * entry heads, not on section headings — headings stay with their first
   * item via a short wrap={false} lead group instead, so a two-line section
   * like Languages can still sit in leftover space.
   *
   * wrap={false} on a block taller than the page paints it on top of
   * whatever precedes it; only use it on groups that are always short
   * (heading + first title, one bullet, one chip).
   */
  entryHeadMinPresence: 36,
  compactRowMinPresence: 28,
  sectionRuleHeight: 1,
  tagRadius: 2,
  tagPadX: 6,
  tagPadY: 3,
  /** Horizontal padding inside each grid cell; doubled is the column gutter. */
  gridGutter: 16,
  gridCellWidth: "50%",
  /** Category column in a tags section; the skills fill the rest of the row. */
  skillLabelWidth: "26%",
} as const;
