/**
 * Print tokens for the `cyan` resume template.
 *
 * react-pdf `StyleSheet` cannot read CSS custom properties, so this file is
 * plain JS constants and must never import `styles/tokens.css` (or any CSS).
 * App-chrome ExaDesign tokens and these print tokens are separate systems.
 *
 * Accents use the ExaDesign cyan scale (cyan.5 / cyan.1 / cyan.9). There is
 * no company logo — the header is name, headline, and contact only.
 */

export const colors = {
  /** cyan.5 — top accent bar, section titles, timeline, and links. */
  brand: "#00b8db",
  /** cyan.1 — contact badge fill. */
  brandSubtle: "#ecfeff",
  /** Near-black — name, job titles, contact values. */
  text: "#010515",
  /** grey.11 — next lighter tint of black, for remaining body copy. */
  textBody: "#222222",
  /** neutral.7 — headline, summary, bullets, skill values, and entry meta. */
  textSecondary: "#45556c",
  /** neutral.5 — dates and contact captions. */
  textMuted: "#8697ad",
  border: "#e4e4e4",
  /** grey.4 — quieter rules. */
  borderMuted: "#f2f2f2",
  surface: "#FFFFFF",
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
  sizeBody: 9,
  /** One step below body — company names, dates, and other lines under titles. */
  sizeSmall: 8,
  sizeTag: 8,
  /** Skill/project chips — one step below contact captions. */
  sizeChip: 7,
  letterSpacingName: -0.3,
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
  /**
   * Chips size their box from the line height, so body leading would hang as
   * dead space under the label. 1 keeps the padding even top and bottom.
   */
  lineHeightTag: 1,
} as const;

/**
 * Gilroy-Bold.ttf OS/2 metrics. @react-pdf/render draws each text line at
 * `box.y + ascent * fontSize / unitsPerEm`, so a sibling View disc sits on
 * the cap-top. Timeline title marks use these numbers to sit on cap-center.
 */
export const gilroy = {
  unitsPerEm: 1000,
  ascent: 773,
  capHeight: 700,
} as const;

/**
 * Inter-Regular.ttf OS/2 metrics (public/fonts/Inter-Regular.ttf), same
 * purpose as `gilroy` above — used to sit the language flag icon on the
 * label's cap-height center rather than its full line-height box, which
 * (per the react-pdf formula in the comment above) sits visibly lower than
 * the text's actual ink.
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
  /** Inset from page top to name/body — below the fixed bar. */
  contentInsetBelowTopBar: 40,
  /** Fixed square size — generous enough to sit comfortably beside a
   * two-line headline, since react-pdf has no way to measure rendered
   * text height ahead of layout to size the photo exactly to match it. */
  photoSize: 64,
  photoRadius: 4,
  /** Filled cyan.1 circle around each cyan contact glyph. */
  contactBadgeSize: 18,
  contactGlyphSize: 9,
  bulletMarkWidth: 10,
  /**
   * Paired with wrap={false} on a flattened entry head (title + one meta
   * line + one description paragraph — see EntryHeading) so the whole group
   * moves to the next page together rather than splitting between title and
   * body. Bullets/tags aren't part of this group and stay separately
   * wrap={false}'d per-row instead, since unlike the head, a bullet list has
   * no bound on how tall it can get — section headings use the same idea via
   * their own short wrap={false} lead group, so a two-line section like
   * Languages can still sit in leftover space.
   *
   * wrap={false} on a block taller than the page paints it on top of
   * whatever precedes it; only use it on groups that are always short
   * (heading + first title, one bullet, one chip, or — now — one entry head).
   */
  entryHeadMinPresence: 36,
  compactRowMinPresence: 28,
  /** Space between a title and the company / result line under it. */
  entryFollowGap: 2,
  /** Left rail for list entries (experience, education, projects). */
  timelineRailWidth: 12,
  timelineDotSize: 7,
  timelineLineWidth: 1,
  timelineBulletSize: 4,
  /** Space between the rail/disc and title, description, and bullets. */
  timelineGap: 8,
  sectionRuleHeight: 1,
  /** Capsule ends — half the chip height or larger. */
  tagRadius: 999,
  tagPadX: 6,
  /**
   * Inter's em-box sits the glyphs low, so equal paddingVertical reads as
   * extra air above the label. Less top than bottom optically centers it.
   */
  tagPadTop: 1,
  tagPadBottom: 3,
  /** Circular flag icon inside a language chip — see templates/languageFlags.ts. */
  languageFlagSize: 10,
  /** Horizontal padding inside each grid cell; doubled is the column gutter. */
  gridGutter: 16,
  gridCellWidth: "50%",
  /** Category column in a tags section; the skills fill the rest of the row. */
  skillLabelWidth: "26%",
} as const;
