/**
 * Brand tokens for the `minimal` resume template.
 *
 * react-pdf `StyleSheet` cannot read CSS custom properties, so this file is
 * plain JS constants and must never import `styles/tokens.css` (or any CSS).
 * App-chrome ExaDesign tokens and these print tokens are separate systems.
 *
 * The vertical full logo is inlined as react-pdf Svg/Path in Logo.tsx (copied
 * from public/assets/Logos/Exa-Logo-Full_Vertical.svg). Same mark as the
 * Exabyting template; the layout chrome here is quieter.
 */

export const colors = {
  /** exa.5 — top accent bar, short section rules, and links. */
  brand: "#0072ED",
  /** Logo mark paths from Exa-Logo-Full_Vertical.svg. */
  logoMark: "#008DFF",
  /** Logo wordmark paths from Exa-Logo-Full_Vertical.svg. */
  logoWordmark: "#08061D",
  /** Near-black — name, section labels, job titles. */
  text: "#010515",
  /** grey.11 — next lighter tint of black, for remaining body copy. */
  textBody: "#222222",
  /** neutral.7 — headline, summary, bullets, skill values, and entry meta. */
  textSecondary: "#45556c",
  /** Dates and contact values; same step, dark enough to survive print. */
  textMuted: "#45556c",
  border: "#e4e4e4",
  /** grey.4 — quieter rules. */
  borderMuted: "#f2f2f2",
  surface: "#FFFFFF",
} as const;

/**
 * Registered in ../fonts.ts. Gilroy is titles (name, section, entry, skill
 * labels); Inter is everything else. letterSpacing is in points — react-pdf
 * cannot read CSS `em` tokens — mapped from the app-chrome tracking scale:
 * name −0.015em at 22pt, section labels keep overline-style open tracking.
 */
export const fonts = {
  family: "Inter",
  display: "Gilroy",
  sizeName: 22,
  sizeHeadline: 10,
  sizeSection: 10,
  sizeBody: 9,
  /** One step below body — company names, dates, and other lines under titles. */
  sizeSmall: 8,
  sizeTag: 8,
  letterSpacingName: -0.33,
  letterSpacingHeadline: 0,
  letterSpacingSection: 1.2,
  letterSpacingEntryTitle: 0,
  /** Body copy, summaries, descriptions, and bullets — keep at least 1.4. */
  lineHeightBody: 1.5,
  lineHeightName: 1.2,
  lineHeightHeadline: 1.3,
  lineHeightSection: 1.25,
  /** Tight enough that a title does not leave a band of air above its meta. */
  lineHeightEntryTitle: 1.15,
} as const;

/**
 * Inter-Regular.ttf OS/2 metrics (public/fonts/Inter-Regular.ttf) — used to
 * sit the language flag icon on the label's cap-height center rather than
 * its full line-height box. react-pdf draws each text line at
 * `box.y + ascent * fontSize / unitsPerEm`, so centering a sibling on the
 * line-height box (e.g. via alignItems: "center") sits it visibly lower
 * than the text's actual cap-to-baseline ink.
 */
export const inter = {
  unitsPerEm: 2048,
  ascent: 1984,
  capHeight: 1490,
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
  topBarHeight: 2,
  /** Inset from page top to the header logo — below the fixed bar. */
  contentInsetBelowTopBar: 40,
  /** Fixed square size — generous enough to sit comfortably beside a
   * two-line headline, since react-pdf has no way to measure rendered
   * text height ahead of layout to size the photo exactly to match it. */
  photoSize: 64,
  photoRadius: 4,
  /** Vertical full logo at the top of the centered header. */
  logoHeight: 32,
  /** SVG width at `logoHeight` (viewBox 75×40). */
  logoWidth: 60,
  contactGlyphSize: 9,
  bulletMarkWidth: 10,
  /**
   * Keep an entry title with the first line of its body. Used on flattened
   * entry heads, not on section headings — headings stay with their first
   * item via a short wrap={false} lead group instead, so a two-line section
   * like Languages can still sit in leftover space.
   *
   * wrap={false} on a block taller than the page paints it on top of
   * whatever precedes it; only use it on groups that are always short
   * (heading + first title, one bullet, one contact item, title + blurb).
   */
  entryHeadMinPresence: 36,
  compactRowMinPresence: 28,
  /** Space between a title and the company / result line under it. */
  entryFollowGap: 2,
  sectionRuleHeight: 1.5,
  /** Short brand underline — not full-bleed, so headings don't stripe the page. */
  sectionRuleWidth: 56,
  /** Horizontal padding inside each grid cell; doubled is the column gutter. */
  gridGutter: 16,
  gridCellWidth: "50%",
  /** Category column in a tags section; the skills fill the rest of the row. */
  skillLabelWidth: "26%",
  /** Circular flag icon inside a language item — see templates/languageFlags.ts. */
  languageFlagSize: 10,
} as const;
