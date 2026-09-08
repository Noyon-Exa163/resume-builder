import type { ReactElement, ReactNode } from "react";
import {
  Document,
  Image as PdfImage,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import "../fonts";
import {
  breakContactValue,
  compactProfileLabel,
  isSystemAlternatePhone,
  maxCharsForWidth,
  phonesForDisplay,
} from "@/lib/contact";
import { formatDateRange } from "@/lib/date";
import { normalizeHeadline } from "@/lib/schema/headline";
import { formatFullNameForDisplay } from "@/lib/schema/personalInfo";
import { resolveLanguageFlagSrc } from "../languageFlags";
import type {
  PageSize,
  ResumeEntry,
  ResumeSection,
  SectionKind,
} from "@/lib/schema/resume";
import { sectionUsesGrid } from "@/lib/schema/resume";
import type { ResumeTemplateProps } from "../types";
import { ExabytingLogoFullVertical } from "./Logo";
import {
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  detectLinkKind,
  linkKindIcon,
} from "./icons";
import { colors, fonts, inter, layout, space } from "./tokens";

const PDF_PAGE_SIZE: Record<PageSize, "A4" | "LETTER"> = {
  A4: "A4",
  Letter: "LETTER",
};

/** react-pdf page widths in pt — used to size the contact flow in real units. */
const PDF_PAGE_WIDTH: Record<PageSize, number> = {
  A4: 595.28,
  Letter: 612,
};

const CONTACT_ICON_GAP = space[1];

/** Between skills within a category row. */
const SKILL_SEPARATOR = " · ";

/**
 * Sits the language flag icon on languageLabel's cap-height center instead
 * of alignItems:"center", which centers on the full line-height box —
 * react-pdf draws each text line at box.y + ascent*fontSize/unitsPerEm, so
 * a sibling centered on the line-height box sits visibly lower than the
 * text's actual cap-to-baseline ink (see tokens.ts's `inter` comment).
 * Combined with languageItem's alignItems:"flex-start".
 */
const LANGUAGE_FLAG_MARGIN_TOP =
  ((inter.ascent - inter.capHeight / 2) / inter.unitsPerEm) * fonts.sizeSmall -
  layout.languageFlagSize / 2;

const styles = StyleSheet.create({
  page: {
    fontFamily: fonts.family,
    fontSize: fonts.sizeBody,
    lineHeight: fonts.lineHeightBody,
    color: colors.textBody,
    backgroundColor: colors.surface,
    paddingTop: layout.pagePaddingY,
    paddingBottom: layout.pagePaddingY,
    paddingHorizontal: layout.pagePaddingX,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: layout.topBarHeight,
    backgroundColor: colors.brand,
  },
  headerSection: {
    marginTop: layout.topBarHeight - layout.pagePaddingY,
    marginBottom: space[4],
  },
  header: {
    flexDirection: "column",
    alignItems: "center",
  },
  logoContainer: {
    paddingTop: layout.contentInsetBelowTopBar,
    marginBottom: space[4],
    alignItems: "center",
  },
  headerLeading: {
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    minWidth: 0,
    overflow: "hidden",
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space[4],
  },
  photo: {
    width: layout.photoSize,
    height: layout.photoSize,
    borderRadius: layout.photoRadius,
    objectFit: "cover",
    flexShrink: 0,
  },
  identityGroup: {
    flexGrow: 0,
    flexShrink: 1,
    flexDirection: "column",
    alignItems: "center",
    minWidth: 0,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: fonts.sizeName,
    fontWeight: 700,
    lineHeight: fonts.lineHeightName,
    letterSpacing: fonts.letterSpacingName,
    color: colors.text,
    textAlign: "center",
  },
  headline: {
    marginTop: layout.entryFollowGap,
    fontFamily: fonts.family,
    fontSize: fonts.sizeHeadline,
    lineHeight: fonts.lineHeightHeadline,
    letterSpacing: fonts.letterSpacingHeadline,
    color: colors.textSecondary,
    textAlign: "center",
  },
  contactFlow: {
    marginTop: space[4],
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: space[2],
  },
  contactChip: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: CONTACT_ICON_GAP,
    flexGrow: 0,
    flexShrink: 0,
  },
  contactGlyph: {
    width: layout.contactGlyphSize,
    height: layout.contactGlyphSize,
    flexShrink: 0,
  },
  contactBody: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
  },
  contactValue: {
    fontSize: fonts.sizeTag,
    lineHeight: fonts.lineHeightHeadline,
    color: colors.textMuted,
    textDecoration: "none",
  },
  contactValueLink: {
    fontSize: fonts.sizeTag,
    lineHeight: fonts.lineHeightHeadline,
    color: colors.brand,
    textDecoration: "none",
  },
  contactLink: {
    textDecoration: "none",
  },
  summary: {
    marginBottom: space[4],
  },
  summaryText: {
    fontSize: fonts.sizeBody,
    lineHeight: fonts.lineHeightBody,
    color: colors.textSecondary,
  },
  sectionHeader: {
    marginBottom: space[2],
  },
  /** Sections are flat page children, so their spacing sits on the heading. */
  sectionHeadingSpaced: {
    marginTop: space[4],
    marginBottom: space[2],
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: fonts.sizeSection,
    fontWeight: 700,
    lineHeight: fonts.lineHeightSection,
    letterSpacing: fonts.letterSpacingSection,
    textTransform: "uppercase",
    color: colors.text,
  },
  sectionRule: {
    marginTop: space[1],
    height: layout.sectionRuleHeight,
    width: layout.sectionRuleWidth,
    alignSelf: "flex-start",
    backgroundColor: colors.brand,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: space[2],
  },
  /** Entries are flat page children, so their spacing sits on the title row. */
  entryHeaderSpaced: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: space[2],
    marginTop: space[4],
  },
  /** Title, then company/meta/description — one column so dates cannot open a gap. */
  entryLead: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  entryTitle: {
    fontFamily: fonts.display,
    fontSize: fonts.sizeBody,
    fontWeight: 700,
    lineHeight: fonts.lineHeightEntryTitle,
    letterSpacing: fonts.letterSpacingEntryTitle,
    color: colors.text,
  },
  entryDates: {
    fontSize: fonts.sizeSmall,
    lineHeight: fonts.lineHeightEntryTitle,
    color: colors.textMuted,
    textAlign: "right",
  },
  entryTitleSpacer: {
    flex: 1,
  },
  entryMeta: {
    marginTop: layout.entryFollowGap,
    fontSize: fonts.sizeSmall,
    lineHeight: fonts.lineHeightName,
    color: colors.textSecondary,
  },
  entryDescription: {
    marginTop: layout.entryFollowGap,
    fontSize: fonts.sizeSmall,
    lineHeight: fonts.lineHeightBody,
    color: colors.textSecondary,
  },
  /** Job blurbs sit further from the company line than a one-line result. */
  entryDescriptionAfterMeta: {
    marginTop: space[2],
  },
  bulletRow: {
    flexDirection: "row",
    marginTop: space[2],
    paddingLeft: space[2],
  },
  bulletMark: {
    width: layout.bulletMarkWidth,
    fontSize: fonts.sizeSmall,
    lineHeight: fonts.lineHeightBody,
    color: colors.textSecondary,
  },
  bulletText: {
    flex: 1,
    fontSize: fonts.sizeSmall,
    lineHeight: fonts.lineHeightBody,
    color: colors.textSecondary,
  },
  link: {
    marginTop: space[1],
    fontSize: fonts.sizeSmall,
    color: colors.brand,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -layout.gridGutter,
  },
  gridCell: {
    width: layout.gridCellWidth,
    paddingHorizontal: layout.gridGutter,
    marginBottom: space[3],
  },
  entryTags: {
    marginTop: space[1],
    fontSize: fonts.sizeSmall,
    color: colors.textMuted,
  },
  skillRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: space[2],
  },
  languageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space[3],
  },
  languageItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space[1],
  },
  languageFlag: {
    width: layout.languageFlagSize,
    height: layout.languageFlagSize,
    borderRadius: layout.languageFlagSize / 2,
    objectFit: "cover",
    marginTop: LANGUAGE_FLAG_MARGIN_TOP,
  },
  languageLabel: {
    fontSize: fonts.sizeSmall,
    lineHeight: fonts.lineHeightBody,
    color: colors.textSecondary,
  },
  skillLabel: {
    width: layout.skillLabelWidth,
    paddingRight: space[2],
    fontFamily: fonts.display,
    fontSize: fonts.sizeBody,
    fontWeight: 700,
    lineHeight: fonts.lineHeightSection,
    color: colors.text,
  },
  skillValues: {
    flex: 1,
    fontSize: fonts.sizeSmall,
    lineHeight: fonts.lineHeightBody,
    color: colors.textSecondary,
  },
});

export function MinimalDocument({ data }: ResumeTemplateProps) {
  const { personalInfo, summary, sections, meta } = data;
  const visibleSections = sections.filter(
    (section) => section.visible && sectionHasContent(section),
  );

  return (
    <Document title={meta.title} author={personalInfo.fullName || undefined}>
      <Page size={PDF_PAGE_SIZE[meta.pageSize]} style={styles.page} wrap>
        <View style={styles.topBar} fixed />
        <View style={styles.headerSection} wrap={false}>
          <Header
            personalInfo={personalInfo}
            pageSize={meta.pageSize}
            nameCasing={meta.nameCasing}
          />
        </View>
        {hasText(summary) ? (
          <View style={styles.summary} wrap={false}>
            <SectionHeading title="Summary" />
            <Text style={styles.summaryText}>{summary}</Text>
          </View>
        ) : null}
        {visibleSections.flatMap((section) => sectionNodes(section))}
      </Page>
    </Document>
  );
}

function Header({
  personalInfo,
  pageSize,
  nameCasing,
}: {
  personalInfo: ResumeTemplateProps["data"]["personalInfo"];
  pageSize: PageSize;
  nameCasing: ResumeTemplateProps["data"]["meta"]["nameCasing"];
}) {
  const photoSrc = isRenderableImageSrc(personalInfo.photoDataUrl)
    ? personalInfo.photoDataUrl.trim()
    : null;
  const headline = normalizeHeadline(personalInfo.headline);
  const hasName = hasText(personalInfo.fullName);
  const hasHeadline = hasText(headline);

  return (
    <View style={styles.header} wrap={false}>
      <View style={styles.logoContainer}>
        <ExabytingLogoFullVertical />
      </View>
      <View style={styles.headerLeading}>
        <View style={styles.identityRow}>
          {photoSrc ? <PdfImage src={photoSrc} style={styles.photo} /> : null}
          <View style={styles.identityGroup}>
            {hasName ? (
              <Text style={styles.name}>
                {preventOrphanWord(
                  formatFullNameForDisplay(personalInfo.fullName, nameCasing),
                )}
              </Text>
            ) : null}
            {hasHeadline ? (
              <Text style={styles.headline}>{preventOrphanWord(headline)}</Text>
            ) : null}
          </View>
        </View>
        <ContactFlow personalInfo={personalInfo} pageSize={pageSize} />
      </View>
    </View>
  );
}

interface ContactItem {
  icon: ReactNode;
  value: string;
  caption: string;
  href?: string;
}

function ContactFlow({
  personalInfo,
  pageSize,
}: {
  personalInfo: ResumeTemplateProps["data"]["personalInfo"];
  pageSize: PageSize;
}) {
  const items = buildContactItems(personalInfo);
  if (items.length === 0) return null;

  const flowWidth = pageContentWidth(pageSize);
  const textMaxWidth = flowWidth - layout.contactGlyphSize - CONTACT_ICON_GAP;
  const maxChars = maxCharsForWidth(textMaxWidth, fonts.sizeTag);

  return (
    <View style={[styles.contactFlow, { width: flowWidth }]}>
      {items.map((item, index) => {
        const displayValue = breakContactValue(item.value, maxChars);
        return (
          <View
            key={`${item.caption}-${index}`}
            style={[styles.contactChip, { maxWidth: flowWidth }]}
            wrap={false}
          >
            {item.icon}
            <View style={styles.contactBody}>
              {item.href ? (
                <Link src={item.href} style={styles.contactLink}>
                  <Text style={styles.contactValueLink}>{displayValue}</Text>
                </Link>
              ) : (
                <Text style={styles.contactValue}>{displayValue}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function pageContentWidth(pageSize: PageSize) {
  return PDF_PAGE_WIDTH[pageSize] - layout.pagePaddingX * 2;
}

function contactGlyph(icon: ReactNode) {
  return <View style={styles.contactGlyph}>{icon}</View>;
}

function profileCaption(url: string): string {
  switch (detectLinkKind(url)) {
    case "github":
      return "GitHub";
    case "linkedin":
      return "LinkedIn";
    default:
      return "Website";
  }
}

function buildContactItems(
  info: ResumeTemplateProps["data"]["personalInfo"],
): ContactItem[] {
  const items: ContactItem[] = [];
  const glyph = colors.brand;
  const glyphSize = layout.contactGlyphSize;

  if (hasText(info.email)) {
    items.push({
      icon: contactGlyph(<MailIcon size={glyphSize} color={glyph} />),
      value: info.email,
      caption: "Email",
    });
  }
  for (const phone of phonesForDisplay(info.phone)) {
    items.push({
      icon: contactGlyph(<PhoneIcon size={glyphSize} color={glyph} />),
      value: phone,
      caption: isSystemAlternatePhone(phone) ? "Alternate" : "Mobile",
    });
  }
  if (hasText(info.location)) {
    items.push({
      icon: contactGlyph(<MapPinIcon size={glyphSize} color={glyph} />),
      value: info.location,
      caption: "Location",
    });
  }
  if (hasText(info.website)) {
    items.push({
      icon: contactGlyph(linkKindIcon(info.website, glyph, glyphSize)),
      value: compactProfileLabel(info.website),
      caption: profileCaption(info.website),
      href: normalizeHref(info.website),
    });
  }
  if (hasText(info.linkedin)) {
    items.push({
      icon: contactGlyph(linkKindIcon(info.linkedin, glyph, glyphSize)),
      value: compactProfileLabel(info.linkedin),
      caption: "LinkedIn",
      href: normalizeHref(info.linkedin),
    });
  }
  if (hasText(info.github)) {
    items.push({
      icon: contactGlyph(linkKindIcon(info.github, glyph, glyphSize)),
      value: compactProfileLabel(info.github),
      caption: "GitHub",
      href: normalizeHref(info.github),
    });
  }
  return items;
}

/**
 * Page-level children for one section. The heading is glued to the first
 * line of content in a wrap={false} lead group: if that group fits, it
 * stays and the rest of the section can split; if it doesn't, react-pdf
 * moves the group (heading and all) to the next page. A fixed
 * minPresenceAhead can't do both — large values exile Languages onto a
 * blank page, small values leave PUBLICATIONS stranded without its entries.
 *
 * The lead group is only a heading plus one title/row, so it is always
 * shorter than a page and never hits the wrap={false} overlap path.
 */
function sectionNodes(section: ResumeSection): ReactElement[] {
  const entries = section.entries.filter(entryHasContent);
  const heading = (
    <SectionHeading
      key={`${section.id}-heading`}
      title={section.title}
      spaced
    />
  );

  if (entries.length === 0) return [heading];

  if (sectionUsesGrid(section)) {
    const leadCells = entries.slice(0, 2);
    const restCells = entries.slice(2);
    const nodes: ReactElement[] = [
      <View key={`${section.id}-lead`} wrap={false}>
        {heading}
        <View style={styles.grid}>{gridCells(leadCells)}</View>
      </View>,
    ];
    if (restCells.length > 0) {
      nodes.push(
        <View key={`${section.id}-grid-rest`} style={styles.grid}>
          {gridCells(restCells)}
        </View>,
      );
    }
    return nodes;
  }

  if (section.layout === "tags") {
    const rows = skillRows(section.id, entries, section.kind);
    // entries can pass entryHasContent (e.g. via a startDate) while none of
    // them carry a title or tags, which skillRows renders as zero rows.
    if (rows.length === 0) return [heading];
    return [
      <View key={`${section.id}-lead`} wrap={false}>
        {heading}
        {rows[0]}
      </View>,
      ...rows.slice(1),
    ];
  }

  const [first, ...rest] = entries;
  const firstParts = entryNodes(first, false);
  return [
    <View key={`${section.id}-lead`} wrap={false}>
      {heading}
      {firstParts[0]}
    </View>,
    ...firstParts.slice(1),
    ...rest.flatMap((entry) => entryNodes(entry, true)),
  ];
}

function gridCells(entries: ResumeEntry[]): ReactElement[] {
  return entries.map((entry) => (
    <View
      key={entry.id}
      style={styles.gridCell}
      wrap={false}
      minPresenceAhead={layout.compactRowMinPresence}
    >
      <CompactEntryBody entry={entry} />
    </View>
  ));
}

function SectionHeading({
  title,
  spaced = false,
}: {
  title: string;
  spaced?: boolean;
}) {
  return (
    <View style={spaced ? styles.sectionHeadingSpaced : styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{preventOrphanWord(title)}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

/**
 * Entries flatten into the page for the same reason sections do: a title
 * nested as the first child of a wrapper never gets its `minPresenceAhead`
 * honoured, so it could sit alone at the foot of a page with its description
 * overleaf. Flat, it has to bring the top of its body with it.
 */
function entryFollowLines(entry: ResumeEntry): {
  dates: string;
  metaLine: string;
} {
  return {
    dates: formatDateRange(entry),
    metaLine: [entry.subtitle, entry.location].filter(hasText).join("  ·  "),
  };
}

function EntryHeading({
  entry,
  dates,
  metaLine,
  description,
  spaced,
  minPresenceAhead,
}: {
  entry: ResumeEntry;
  dates: string;
  metaLine: string;
  description?: boolean;
  spaced?: boolean;
  minPresenceAhead?: number;
}) {
  return (
    <View
      style={spaced ? styles.entryHeaderSpaced : styles.entryHeader}
      wrap={false}
      minPresenceAhead={minPresenceAhead}
    >
      <View style={styles.entryLead}>
        {hasText(entry.title) ? (
          <Text style={styles.entryTitle}>
            {preventOrphanWord(entry.title)}
          </Text>
        ) : (
          <View style={styles.entryTitleSpacer} />
        )}
        {metaLine ? <Text style={styles.entryMeta}>{metaLine}</Text> : null}
        {description && hasText(entry.description) ? (
          <Text
            style={
              metaLine
                ? [styles.entryDescription, styles.entryDescriptionAfterMeta]
                : styles.entryDescription
            }
          >
            {entry.description}
          </Text>
        ) : null}
      </View>
      {dates ? <Text style={styles.entryDates}>{dates}</Text> : null}
    </View>
  );
}

function entryNodes(entry: ResumeEntry, spaced: boolean): ReactElement[] {
  const { dates, metaLine } = entryFollowLines(entry);
  const bullets = entry.bullets.filter(hasText);
  const tags = entry.tags.filter(hasText);

  const nodes: ReactElement[] = [
    <EntryHeading
      key={`${entry.id}-head`}
      entry={entry}
      dates={dates}
      metaLine={metaLine}
      description
      spaced={spaced}
      minPresenceAhead={layout.entryHeadMinPresence}
    />,
  ];

  nodes.push(
    ...bullets.map((bullet, index) => (
      <View
        key={`${entry.id}-b-${index}`}
        style={styles.bulletRow}
        wrap={false}
      >
        <Text style={styles.bulletMark}>•</Text>
        <Text style={styles.bulletText}>{bullet}</Text>
      </View>
    )),
  );
  if (tags.length > 0) {
    // Flattened like bullets (see the lead-group doc comment above), but
    // tags are always one bounded row — minPresenceAhead (TagLine already
    // carries its own wrap={false}) keeps them from committing to the very
    // bottom of a page as a stranded fragment left behind by the entry's
    // bullets/description on the page before.
    nodes.push(
      <View
        key={`${entry.id}-tags`}
        wrap={false}
        minPresenceAhead={layout.entryHeadMinPresence}
      >
        <TagLine tags={tags} />
      </View>,
    );
  }
  if (hasText(entry.link)) {
    nodes.push(
      <Link
        key={`${entry.id}-link`}
        src={normalizeHref(entry.link)}
        style={styles.link}
      >
        {displayLink(entry.link)}
      </Link>,
    );
  }

  return nodes;
}

/** Grid cells stay nested — they are cells of a wrapping flex row. */
function CompactEntryBody({ entry }: { entry: ResumeEntry }) {
  const { dates, metaLine } = entryFollowLines(entry);
  const compactMeta = [metaLine, dates].filter(Boolean).join("  ·  ");
  const bullets = entry.bullets.filter(hasText);
  const tags = entry.tags.filter(hasText);

  return (
    <View>
      <EntryHeading entry={entry} dates="" metaLine={compactMeta} description />
      {bullets.map((bullet, index) => (
        <View key={`${entry.id}-b-${index}`} style={styles.bulletRow}>
          <Text style={styles.bulletMark}>•</Text>
          <Text style={styles.bulletText}>{bullet}</Text>
        </View>
      ))}
      {tags.length > 0 ? <TagLine tags={tags} /> : null}
      {hasText(entry.link) ? (
        <Link src={normalizeHref(entry.link)} style={styles.link}>
          {displayLink(entry.link)}
        </Link>
      ) : null}
    </View>
  );
}

/**
 * Skills read as a two-column table — category on the left, its skills running
 * as one line of text on the right. Chips were costing a line per category
 * plus padding around all 80-odd items, which is a lot of page for a list of
 * words.
 *
 * Languages are the one "tags" layout kind that don't fit that table: each
 * language is its own entry (title = name, no tags — see EntryForm.tsx's
 * showTags), so they'd otherwise all land in the single uncategorised row,
 * joined by SKILL_SEPARATOR. Render those as flag + name pairs instead.
 */
function skillRows(
  sectionId: string,
  entries: ResumeEntry[],
  sectionKind: SectionKind,
): ReactElement[] {
  if (sectionKind === "languages") {
    const languages = entries.filter((entry) => hasText(entry.title));
    if (languages.length === 0) return [];
    return [
      <View key={`${sectionId}-languages`} style={styles.languageRow}>
        {languages.map((entry) => (
          <View key={entry.id} style={styles.languageItem} wrap={false}>
            <PdfImage
              src={resolveLanguageFlagSrc(entry.title)}
              style={styles.languageFlag}
            />
            <Text style={styles.languageLabel}>{entry.title.trim()}</Text>
          </View>
        ))}
      </View>,
    ];
  }

  const rows = entries.map((entry) => ({
    id: entry.id,
    label: hasText(entry.title) ? entry.title.trim() : "",
    skills: entry.tags.filter(hasText),
  }));

  // An entry carrying only a title is a single uncategorised skill; those
  // collect into one row instead of taking a labelled row each.
  const uncategorised = rows
    .filter((row) => row.skills.length === 0 && row.label)
    .map((row) => row.label);

  const nodes = rows
    .filter((row) => row.skills.length > 0)
    .map((row) => (
      <View key={row.id} style={styles.skillRow}>
        {row.label ? <Text style={styles.skillLabel}>{row.label}</Text> : null}
        <Text style={styles.skillValues}>
          {row.skills.join(SKILL_SEPARATOR)}
        </Text>
      </View>
    ));

  if (uncategorised.length > 0) {
    nodes.push(
      <View key={`${sectionId}-uncategorised-skills`} style={styles.skillRow}>
        <Text style={styles.skillValues}>
          {uncategorised.join(SKILL_SEPARATOR)}
        </Text>
      </View>,
    );
  }

  return nodes;
}

function TagLine({ tags }: { tags: string[] }) {
  return (
    <View wrap={false}>
      <Text style={styles.entryTags}>{tags.join(SKILL_SEPARATOR)}</Text>
    </View>
  );
}

function displayLink(value: string): string {
  return value.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

/** Adds a scheme if the stored value doesn't already have one (e.g. a
 * heuristic/AI import saved "linkedin.com/in/x" rather than a full URL) —
 * react-pdf's <Link> needs an absolute URL to be clickable. */
function normalizeHref(value: string): string {
  const trimmed = value.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Ties the last two words together with a non-breaking space so a wrapped
 * line never strands a single lone word by itself (an "orphan").
 */
function preventOrphanWord(value: string): string {
  const lastSpace = value.trim().lastIndexOf(" ");
  if (lastSpace === -1) return value;
  return `${value.slice(0, lastSpace)} ${value.slice(lastSpace + 1)}`;
}

function hasText(value: string | undefined): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isRenderableImageSrc(src: string | undefined | null): src is string {
  if (!src) return false;
  const value = src.trim();
  if (value.length === 0) return false;
  return (
    value.startsWith("data:image/") ||
    value.startsWith("https://") ||
    value.startsWith("http://") ||
    value.startsWith("/")
  );
}

function sectionHasContent(section: ResumeSection): boolean {
  return hasText(section.title) || section.entries.some(entryHasContent);
}

function entryHasContent(entry: ResumeEntry): boolean {
  return (
    hasText(entry.title) ||
    hasText(entry.subtitle) ||
    hasText(entry.location) ||
    hasText(entry.startDate) ||
    hasText(entry.endDate) ||
    hasText(entry.description) ||
    hasText(entry.link) ||
    entry.bullets.some(hasText) ||
    entry.tags.some(hasText)
  );
}
