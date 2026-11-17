import { uppercaseKeepingBrands } from "@/lib/schema/brandCasing";
import type { ReactElement, ReactNode } from "react";
import {
  Circle,
  Document,
  Image as PdfImage,
  Link,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";

import "../fonts";
import {
  breakContactValue,
  compactProfileLabel,
  extractEntryContact,
  formatBangladeshiPhone,
  isSystemAlternatePhone,
  maxCharsForWidth,
  phonesForDisplay,
  type EntryContactItem,
} from "@/lib/contact";
import { formatDateRange } from "@/lib/date";
import { entrySubtitle } from "@/lib/schema/entryOrganization";
import { normalizeHeadline } from "@/lib/schema/headline";
import { formatFullNameForDisplay } from "@/lib/schema/personalInfo";
import { resolveLanguageFlagSrc } from "../languageFlags";
import type { Style } from "@react-pdf/types";
import { splitDesignationAndCompany } from "@/lib/schema/entryOrganization";
import { SkillList, type SkillListItem } from "../SkillList";
import { resolveSkillIcon } from "@/lib/skillIcons/resolveSkillIcon";
import type {
  PageSize,
  ResumeEntry,
  ResumeSection,
  SectionKind,
} from "@/lib/schema/resume";
import { isReferencesSectionTitle, sectionUsesGrid } from "@/lib/schema/resume";
import type { ResumeTemplateProps } from "../types";
import { ExabytingLogoFullVertical } from "./Logo";
import {
  AwardIcon,
  BriefcaseIcon,
  FolderBookmarkIcon,
  GraduationCapIcon,
  LayoutGridIcon,
  MailIcon,
  MapPinIcon,
  NotebookTextIcon,
  PhoneIcon,
  TrophyIcon,
  UsersIcon,
  detectLinkKind,
  linkKindIcon,
} from "./icons";
import { colors, fonts, gilroy, inter, layout, space } from "./tokens";

const PDF_PAGE_SIZE: Record<PageSize, "A4" | "LETTER"> = {
  A4: "A4",
  Letter: "LETTER",
};

/** react-pdf page widths in pt — used to size the contact flow in real units. */
const PDF_PAGE_WIDTH: Record<PageSize, number> = {
  A4: 595.28,
  Letter: 612,
};

const CONTACT_ICON_GAP = space[2];
/** Badge + gap — keeps bullets/tags under the title, not under the icon. */
const ENTRY_ICON_INSET = layout.contactBadgeSize + CONTACT_ICON_GAP;

/** Between skills within a category row. */
const SKILL_SEPARATOR = " · ";

/**
 * Sits the language flag icon on languageLabel's cap-height center instead
 * of alignItems:"center", which centers on the full line-height box — see
 * titleCapCenterY's comment above for why that sits visibly low. Combined
 * with languageItem's alignItems:"flex-start".
 */
const LANGUAGE_FLAG_MARGIN_TOP =
  ((inter.ascent - inter.capHeight / 2) / inter.unitsPerEm) * fonts.sizeSmall -
  layout.languageFlagSize / 2;

/**
 * How far Inter's glyphs sit below the middle of a one-line chip label (line
 * height 1). The skill chip centres its icon on the chip, so the label is
 * lifted by this much to put its letters on the same centre.
 */
const SKILL_LABEL_OFFSET_TOP =
  ((inter.ascent - inter.capHeight / 2) / inter.unitsPerEm - 0.5) *
  fonts.sizeChip;

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
    marginHorizontal: -layout.pagePaddingX,
    marginBottom: space[4],
  },
  header: {
    flexDirection: "column",
  },
  /** Name, headline, and logo share this row so the mark only grows with them. */
  headerIdentity: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  /**
   * Matches the logo column so name/headline sit on the page center instead
   * of the leftover space to the left of the mark.
   */
  headerBalance: {
    width: layout.logoColumnWidth,
    flexGrow: 0,
    flexShrink: 0,
  },
  headerLeading: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    flexDirection: "column",
    alignItems: "center",
    paddingTop: layout.contentInsetBelowTopBar,
    paddingHorizontal: layout.headerLogoGap,
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
  logoContainer: {
    width: layout.logoColumnWidth,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: colors.brandSubtle,
    paddingHorizontal: layout.logoContainerPadX,
    paddingVertical: layout.logoContainerPadY,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "stretch",
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
    fontFamily: fonts.family,
    fontSize: fonts.sizeHeadline,
    lineHeight: fonts.lineHeightHeadline,
    letterSpacing: fonts.letterSpacingHeadline,
    color: colors.textSecondary,
    textAlign: "center",
  },
  headerContact: {
    paddingLeft: layout.pagePaddingX,
    paddingRight: layout.pagePaddingX,
  },
  contactFlow: {
    marginTop: space[4],
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: space[3],
  },
  contactChip: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: CONTACT_ICON_GAP,
    flexGrow: 0,
    flexShrink: 0,
  },
  contactBadge: {
    width: layout.contactBadgeSize,
    height: layout.contactBadgeSize,
    borderRadius: layout.contactBadgeSize / 2,
    backgroundColor: colors.brandSubtle,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  contactBody: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
  },
  contactValue: {
    marginTop: 1,
    fontSize: fonts.sizeTag,
    lineHeight: fonts.lineHeightHeadline,
    color: colors.text,
    textDecoration: "none",
  },
  contactLink: {
    textDecoration: "none",
  },
  /** Sits above the value now — one step smaller (sizeChip) so it reads as
   *  a label, not a second value line. */
  contactCaption: {
    fontSize: fonts.sizeChip,
    lineHeight: fonts.lineHeightTag,
    color: colors.textMuted,
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
    color: colors.brand,
  },
  sectionRule: {
    marginTop: space[1],
    height: layout.sectionRuleHeight,
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
  entryIcon: {
    flexShrink: 0,
  },
  entryTitleLine: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineRail: {
    width: layout.timelineRailWidth,
    flexGrow: 0,
    flexShrink: 0,
    alignItems: "center",
    alignSelf: "stretch",
  },
  timelineHeadingSpaced: {
    marginTop: space[4],
  },
  timelineTitleRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineTitleRail: {
    width: layout.timelineRailWidth,
    flexGrow: 0,
    flexShrink: 0,
  },
  timelineContent: {
    marginLeft: layout.timelineGap,
  },
  timelineHeadingFollow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "stretch",
  },
  timelineLine: {
    width: layout.timelineLineWidth,
    flexGrow: 1,
    backgroundColor: colors.brand,
  },
  timelineBulletRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineBulletBody: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    marginLeft: layout.timelineGap,
    paddingTop: space[2],
  },
  timelineBulletDot: {
    width: layout.timelineBulletSize,
    height: layout.timelineBulletSize,
    borderRadius: layout.timelineBulletSize / 2,
    backgroundColor: colors.brand,
    marginTop: 3,
    marginRight: space[2],
    flexGrow: 0,
    flexShrink: 0,
  },
  timelineBulletTextWrap: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  timelineBulletText: {
    fontSize: fonts.sizeSmall,
    lineHeight: fonts.lineHeightBody,
    color: colors.textSecondary,
  },
  timelineFollow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineFollowBody: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    marginLeft: layout.timelineGap,
    paddingTop: space[1],
  },
  timelineLink: {
    marginTop: 0,
  },
  entryTitle: {
    fontFamily: fonts.display,
    fontSize: fonts.sizeBody,
    fontWeight: 700,
    lineHeight: fonts.lineHeightEntryTitle,
    letterSpacing: fonts.letterSpacingEntryTitle,
    color: colors.text,
  },
  entryFollowIndent: {
    paddingLeft: ENTRY_ICON_INSET,
  },
  bulletRowIndented: {
    flexDirection: "row",
    marginTop: space[2],
    paddingLeft: ENTRY_ICON_INSET + space[2],
  },
  entryDates: {
    fontSize: fonts.sizeSmall,
    lineHeight: fonts.lineHeightEntryTitle,
    color: colors.textMuted,
    textAlign: "right",
    flexShrink: 0,
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
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: space[2],
    marginTop: space[1],
  },
  tag: {
    backgroundColor: colors.tagBackground,
    borderRadius: layout.tagRadius,
    paddingHorizontal: layout.tagPadX,
    paddingTop: layout.tagPadTop,
    paddingBottom: layout.tagPadBottom,
    justifyContent: "center",
  },
  tagLabel: {
    fontFamily: fonts.family,
    fontSize: fonts.sizeChip,
    lineHeight: fonts.lineHeightTag,
    color: colors.tagText,
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
  /** Capsule around one skill — white with a light grey
   *  outline so full-colour logos sit on a clean ground, at a fixed height so
   *  chips with and without an icon match. */
  skillChip: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: layout.tagRadius,
    paddingHorizontal: layout.skillChipPadX,
    height: layout.skillChipHeight,
  },
  skillChipLabel: {
    fontFamily: fonts.family,
    fontSize: fonts.sizeChip,
    lineHeight: fonts.lineHeightTag,
    color: colors.tagText,
  },
  skillValues: {
    flex: 1,
    fontSize: fonts.sizeSmall,
    lineHeight: fonts.lineHeightBody,
    color: colors.textSecondary,
  },
  refContactList: {
    marginTop: layout.entryFollowGap,
    paddingLeft: ENTRY_ICON_INSET,
    flexDirection: "column",
    gap: 6,
  },
  refRow: {
    flexDirection: "row",
    gap: layout.referenceCardGap,
    marginBottom: layout.referenceCardGap,
  },
  /** One referee: white with a light outline, like the skill chips. */
  refCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: layout.referenceCardRadius,
    padding: layout.referenceCardPad,
  },
  refName: {
    fontFamily: fonts.display,
    fontSize: fonts.sizeBody,
    fontWeight: 700,
    lineHeight: fonts.lineHeightEntryTitle,
    color: colors.text,
  },
  refRole: {
    marginTop: layout.entryFollowGap,
    fontSize: fonts.sizeSmall,
    lineHeight: fonts.lineHeightBody,
    color: colors.textSecondary,
  },
  refCompany: {
    fontSize: fonts.sizeSmall,
    lineHeight: fonts.lineHeightBody,
    color: colors.textSecondary,
  },
  refDetail: {
    fontSize: fonts.sizeSmall,
    lineHeight: fonts.lineHeightBody,
    color: colors.textMuted,
  },
  refContactCard: {
    marginTop: space[2],
    flexDirection: "column",
    gap: 5,
  },
  refContactRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space[1],
    maxWidth: "100%",
    textDecoration: "none",
  },
  refContactGlyph: {
    width: 8,
    height: 8,
    marginTop: 1,
    flexShrink: 0,
  },
  refContactValue: {
    flexShrink: 1,
    fontSize: fonts.sizeSmall,
    lineHeight: 1,
    color: colors.textSecondary,
  },
});

export function ExabytingDocument({ data }: ResumeTemplateProps) {
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
            showAlternatePhone={meta.alternatePhoneVisible}
          />
        </View>
        {hasText(summary) ? (
          <View style={styles.summary}>
            <SectionHeading title="Summary" />
            <Text style={styles.summaryText}>{summary}</Text>
          </View>
        ) : null}
        {visibleSections.flatMap((section) =>
          sectionNodes(section, meta.pageSize),
        )}
      </Page>
    </Document>
  );
}

function Header({
  personalInfo,
  pageSize,
  nameCasing,
  showAlternatePhone,
}: {
  personalInfo: ResumeTemplateProps["data"]["personalInfo"];
  pageSize: PageSize;
  nameCasing: ResumeTemplateProps["data"]["meta"]["nameCasing"];
  showAlternatePhone: boolean;
}) {
  const photoSrc = isRenderableImageSrc(personalInfo.photoDataUrl)
    ? personalInfo.photoDataUrl.trim()
    : null;
  const headline = normalizeHeadline(personalInfo.headline);
  const hasName = hasText(personalInfo.fullName);
  const hasHeadline = hasText(headline);

  return (
    <View style={styles.header} wrap={false}>
      <View style={styles.headerIdentity}>
        <View style={styles.headerBalance} />
        <View style={styles.headerLeading}>
          <View style={styles.identityRow}>
            {photoSrc ? <PdfImage src={photoSrc} style={styles.photo} /> : null}
            <View style={styles.identityGroup}>
              {hasName ? (
                <Text style={styles.name}>
                  {formatFullNameForDisplay(personalInfo.fullName, nameCasing)}
                </Text>
              ) : null}
              {hasHeadline ? (
                <Text style={styles.headline}>
                  {preventOrphanWord(headline)}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
        <View style={styles.logoContainer}>
          <ExabytingLogoFullVertical />
        </View>
      </View>
      <View style={styles.headerContact}>
        <ContactFlow
          personalInfo={personalInfo}
          showAlternatePhone={showAlternatePhone}
          pageSize={pageSize}
        />
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
  showAlternatePhone,
  pageSize,
}: {
  personalInfo: ResumeTemplateProps["data"]["personalInfo"];
  showAlternatePhone: boolean;
  pageSize: PageSize;
}) {
  const items = buildContactItems(personalInfo, showAlternatePhone);
  if (items.length === 0) return null;

  const flowWidth = pageContentWidth(pageSize);
  const textMaxWidth = flowWidth - layout.contactBadgeSize - CONTACT_ICON_GAP;
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
              <Text style={styles.contactCaption}>{item.caption}</Text>
              {item.href ? (
                <Link src={item.href} style={styles.contactLink}>
                  <Text style={styles.contactValue}>{displayValue}</Text>
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

function timelineBodyWidth(pageSize: PageSize) {
  return (
    pageContentWidth(pageSize) - layout.timelineRailWidth - layout.timelineGap
  );
}

function timelineBulletTextWidth(pageSize: PageSize) {
  return timelineBodyWidth(pageSize) - layout.timelineBulletSize - space[2];
}

/** Inverse of maxCharsForWidth, plus a gutter so the title never meets the date. */
function dateColumnWidth(dates: string): number {
  return space[2] + Math.ceil(dates.length * fonts.sizeSmall * 0.62);
}

function contactBadge(icon: ReactNode) {
  return <View style={styles.contactBadge}>{icon}</View>;
}

function kindGlyph(kind: SectionKind, title?: string): ReactNode {
  const color = colors.brand;
  const size = layout.contactGlyphSize;
  if (title && isReferencesSectionTitle(title)) {
    return <UsersIcon size={size} color={color} />;
  }
  if (title && isPublicationsSectionTitle(title)) {
    return <NotebookTextIcon size={size} color={color} />;
  }
  switch (kind) {
    case "experience":
      return <BriefcaseIcon size={size} color={color} />;
    case "education":
      return <GraduationCapIcon size={size} color={color} />;
    case "projects":
      return <FolderBookmarkIcon size={size} color={color} />;
    case "certifications":
      return <AwardIcon size={size} color={color} />;
    case "awards":
      return <TrophyIcon size={size} color={color} />;
    default:
      return <LayoutGridIcon size={size} color={color} />;
  }
}

function kindBadge(kind: SectionKind, title?: string): ReactNode {
  return contactBadge(kindGlyph(kind, title));
}

function isPublicationsSectionTitle(title: string): boolean {
  return /^(publications?|papers?|research)$/i.test(title.trim());
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
  showAlternatePhone: boolean,
): ContactItem[] {
  const items: ContactItem[] = [];
  const glyph = colors.brand;
  const glyphSize = layout.contactGlyphSize;

  if (hasText(info.email)) {
    items.push({
      icon: contactBadge(<MailIcon size={glyphSize} color={glyph} />),
      value: info.email,
      caption: "Email",
    });
  }
  for (const phone of phonesForDisplay(info.phone, showAlternatePhone)) {
    items.push({
      icon: contactBadge(<PhoneIcon size={glyphSize} color={glyph} />),
      value: phone,
      caption: isSystemAlternatePhone(phone) ? "Alternate" : "Mobile",
    });
  }
  if (hasText(info.location)) {
    items.push({
      icon: contactBadge(<MapPinIcon size={glyphSize} color={glyph} />),
      value: info.location,
      caption: "Location",
    });
  }
  if (hasText(info.website)) {
    items.push({
      icon: contactBadge(linkKindIcon(info.website, glyph, glyphSize)),
      value: compactProfileLabel(info.website),
      caption: profileCaption(info.website),
      href: normalizeHref(info.website),
    });
  }
  if (hasText(info.linkedin)) {
    items.push({
      icon: contactBadge(linkKindIcon(info.linkedin, glyph, glyphSize)),
      value: compactProfileLabel(info.linkedin),
      caption: "LinkedIn",
      href: normalizeHref(info.linkedin),
    });
  }
  if (hasText(info.github)) {
    items.push({
      icon: contactBadge(linkKindIcon(info.github, glyph, glyphSize)),
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
function sectionNodes(
  section: ResumeSection,
  pageSize: PageSize,
): ReactElement[] {
  const entries = section.entries.filter(entryHasContent);
  const heading = (
    <SectionHeading
      key={`${section.id}-heading`}
      title={section.title}
      spaced
    />
  );

  if (entries.length === 0) return [heading];

  if (isReferencesSectionTitle(section.title)) {
    const [leadRow, ...restRows] = referenceRows(entries, section, pageSize);
    return [
      <View key={`${section.id}-lead`} wrap={false}>
        {heading}
        {leadRow}
      </View>,
      ...restRows,
    ];
  }

  if (sectionUsesGrid(section)) {
    const leadCells = entries.slice(0, 2);
    const restCells = entries.slice(2);
    const nodes: ReactElement[] = [
      <View key={`${section.id}-lead`} wrap={false}>
        {heading}
        <View style={styles.grid}>{gridCells(leadCells, section)}</View>
      </View>,
    ];
    if (restCells.length > 0) {
      nodes.push(
        <View key={`${section.id}-grid-rest`} style={styles.grid}>
          {gridCells(restCells, section)}
        </View>,
      );
    }
    return nodes;
  }

  if (section.layout === "tags") {
    const rows = skillRows(
      section.id,
      entries,
      section.kind,
      section.showSkillIcons,
    );
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
  const firstParts = entryNodes(first, false, section, pageSize);
  // minPresenceAhead on the lead group itself (not on the head nested inside
  // it, where it is ignored) keeps the heading and first entry head from
  // sitting at the foot of a page with their first bullet stranded overleaf.
  return [
    <View
      key={`${section.id}-lead`}
      wrap={false}
      minPresenceAhead={layout.entryHeadMinPresence}
    >
      {heading}
      {firstParts[0]}
    </View>,
    ...firstParts.slice(1),
    ...rest.flatMap((entry) => entryNodes(entry, true, section, pageSize)),
  ];
}

function gridCells(
  entries: ResumeEntry[],
  section: ResumeSection,
): ReactElement[] {
  return entries.map((entry) => (
    <View
      key={entry.id}
      style={styles.gridCell}
      wrap={false}
      minPresenceAhead={layout.compactRowMinPresence}
    >
      <CompactEntryBody entry={entry} section={section} />
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
      <Text style={styles.sectionTitle}>{uppercaseKeepingBrands(title)}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

/**
 * Entries flatten into the page for the same reason sections do: a title
 * nested as the first child of a wrapper never gets its `minPresenceAhead`
 * honoured, so it could sit alone at the foot of a page with its description
 * overleaf. Flat, it has to bring the top of its body with it — that's also
 * why EntryHeading's own title+meta+description block is `wrap={false}`
 * (see EntryHeading below): flattening keeps the head from being trapped
 * inside an unrelated wrapper, but without wrap={false} on the head itself,
 * react-pdf could still split title from description *within* it. Bullets
 * and tags are pushed as separate sibling nodes (each individually
 * wrap={false}) rather than folded into this group, since unlike the title
 * + one meta line + one description paragraph, a bullet list has no bound
 * on how tall it can get.
 */
function usesTimeline(section: ResumeSection): boolean {
  return section.layout === "list" && !sectionUsesGrid(section);
}

function entryFollowLines(
  entry: ResumeEntry,
  separator = "  ·  ",
): {
  dates: string;
  metaLine: string;
} {
  return {
    dates: formatDateRange(entry),
    metaLine: [entrySubtitle(entry), entry.location]
      .filter(hasText)
      .join(separator),
  };
}

function EntryHeading({
  entry,
  dates,
  metaLine,
  description,
  spaced,
  minPresenceAhead,
  icon,
  timeline = false,
  pageSize = "A4",
}: {
  entry: ResumeEntry;
  dates: string;
  metaLine: string;
  description?: boolean;
  spaced?: boolean;
  minPresenceAhead?: number;
  icon?: ReactNode;
  timeline?: boolean;
  pageSize?: PageSize;
}) {
  const title = hasText(entry.title) ? (
    <Text style={styles.entryTitle}>{entry.title}</Text>
  ) : (
    <View style={styles.entryTitleSpacer} />
  );
  const descriptionNode =
    description && hasText(entry.description) ? (
      <Text
        style={
          metaLine
            ? [styles.entryDescription, styles.entryDescriptionAfterMeta]
            : styles.entryDescription
        }
      >
        {entry.description}
      </Text>
    ) : null;
  const hasFollowText = Boolean(metaLine) || Boolean(descriptionNode);
  const centerOnIcon = Boolean(icon) && !hasFollowText;

  if (timeline) {
    const contentWidth = pageContentWidth(pageSize);
    const bodyWidth = timelineBodyWidth(pageSize);
    const dateWidth = dates ? dateColumnWidth(dates) : 0;
    const titleWidth = dates ? Math.max(0, bodyWidth - dateWidth) : bodyWidth;
    return (
      <View
        style={spaced ? styles.timelineHeadingSpaced : undefined}
        minPresenceAhead={minPresenceAhead}
        wrap={false}
      >
        <View style={[styles.timelineTitleRow, { width: contentWidth }]}>
          <View style={styles.timelineTitleRail}>
            <TimelineTitleMark />
          </View>
          <View style={[styles.timelineContent, { width: bodyWidth }]}>
            <View style={styles.entryTitleLine}>
              <View style={{ width: titleWidth }}>
                <Text style={styles.entryTitle}>
                  {hasText(entry.title) ? entry.title : " "}
                </Text>
              </View>
              {dates ? (
                <Text
                  style={[
                    styles.entryDates,
                    { width: dateWidth, paddingLeft: space[2] },
                  ]}
                >
                  {dates}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
        {hasFollowText ? (
          <View style={[styles.timelineHeadingFollow, { width: contentWidth }]}>
            <TimelineRail />
            <View
              style={[
                styles.timelineFollowBody,
                { width: bodyWidth, paddingTop: 0 },
              ]}
            >
              {metaLine ? (
                <Text style={styles.entryMeta}>{metaLine}</Text>
              ) : null}
              {descriptionNode}
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={[
        spaced ? styles.entryHeaderSpaced : styles.entryHeader,
        { alignItems: centerOnIcon ? "center" : "flex-start" },
      ]}
      minPresenceAhead={minPresenceAhead}
    >
      {icon ? <View style={styles.entryIcon}>{icon}</View> : null}
      <View style={styles.entryLead}>
        {title}
        {metaLine ? <Text style={styles.entryMeta}>{metaLine}</Text> : null}
        {descriptionNode}
      </View>
      {dates ? <Text style={styles.entryDates}>{dates}</Text> : null}
    </View>
  );
}

function titleLineBoxHeight() {
  return fonts.sizeBody * fonts.lineHeightEntryTitle;
}

/** Same y react-pdf uses for the title baseline, minus half the cap height. */
function titleCapCenterY() {
  return (
    ((gilroy.ascent - gilroy.capHeight / 2) / gilroy.unitsPerEm) *
    fonts.sizeBody
  );
}

function TimelineTitleMark() {
  const width = layout.timelineRailWidth;
  const height = titleLineBoxHeight();
  const cx = width / 2;
  const cy = titleCapCenterY();
  const radius = layout.timelineDotSize / 2;
  const lineTop = cy + radius;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Circle cx={cx} cy={cy} r={radius} fill={colors.brand} />
      {lineTop < height ? (
        <Path
          d={`M ${cx} ${lineTop} L ${cx} ${height}`}
          stroke={colors.brand}
          strokeWidth={layout.timelineLineWidth}
        />
      ) : null}
    </Svg>
  );
}

function TimelineRail() {
  return (
    <View style={styles.timelineRail}>
      <View style={styles.timelineLine} />
    </View>
  );
}

function entryNodes(
  entry: ResumeEntry,
  spaced: boolean,
  section: ResumeSection,
  pageSize: PageSize,
): ReactElement[] {
  const display = referenceDisplay(entry, section);
  const timeline = usesTimeline(section);
  const bodyWidth = timelineBodyWidth(pageSize);
  const bulletTextWidth = timelineBulletTextWidth(pageSize);
  const { dates, metaLine } = entryFollowLines(
    display.entry,
    timeline ? "  |  " : "  ·  ",
  );
  const tags = entry.tags.filter(hasText);
  const icon = timeline ? undefined : kindBadge(section.kind, section.title);

  const nodes: ReactElement[] = [
    <EntryHeading
      key={`${entry.id}-head`}
      entry={display.entry}
      dates={dates}
      metaLine={metaLine}
      description
      spaced={spaced}
      minPresenceAhead={layout.entryHeadMinPresence}
      icon={icon}
      timeline={timeline}
      pageSize={pageSize}
    />,
  ];

  // Academic info for education entries (CGPA / GPA / Science), shown as a
  // clickable line under the entry heading so it can be inline-edited.
  if (section.kind === "education") {
    const academic = [
      entry.cgpa && `CGPA ${entry.cgpa}`,
      entry.gpa && `GPA ${entry.gpa}`,
      entry.science && entry.science,
    ]
      .filter(Boolean)
      .join("  ·  ");
    if (academic) {
      nodes.push(
        <Text
          key={`${entry.id}-academic`}
          style={[styles.entryMeta, styles.entryFollowIndent]}
        >
          {academic}
        </Text>
      );
    }
  }

  if (display.contact.length > 0) {
    nodes.push(
      <ReferenceContactList
        key={`${entry.id}-contact`}
        items={display.contact}
      />,
    );
  }

  nodes.push(
    ...display.bullets.map((bullet, index) =>
      timeline ? (
        <View
          key={`${entry.id}-b-${index}`}
          style={[
            styles.timelineBulletRow,
            { width: pageContentWidth(pageSize) },
          ]}
          wrap={false}
        >
          <TimelineRail />
          <View style={[styles.timelineBulletBody, { width: bodyWidth }]}>
            <View style={styles.timelineBulletDot} />
            <View
              style={[
                styles.timelineBulletTextWrap,
                { width: bulletTextWidth },
              ]}
            >
              <Text style={styles.timelineBulletText}>{bullet}</Text>
            </View>
          </View>
        </View>
      ) : (
        <View
          key={`${entry.id}-b-${index}`}
          style={styles.bulletRowIndented}
          wrap={false}
        >
          <Text style={styles.bulletMark}>•</Text>
          <Text style={styles.bulletText}>{bullet}</Text>
        </View>
      ),
    ),
  );
  if (tags.length > 0) {
    // Flattened like bullets (see usesTimeline's doc comment), but tags are
    // always one bounded row — wrap={false} + the same short-lead-group
    // minPresenceAhead used on the entry head keeps them from committing to
    // the very bottom of a page as a stranded fragment with the entry's
    // bullets/description left behind on the page before.
    nodes.push(
      timeline ? (
        <View
          key={`${entry.id}-tags`}
          style={[styles.timelineFollow, { width: pageContentWidth(pageSize) }]}
          wrap={false}
          minPresenceAhead={layout.entryHeadMinPresence}
        >
          <TimelineRail />
          <View style={[styles.timelineFollowBody, { width: bodyWidth }]}>
            <TagRow tags={tags} />
          </View>
        </View>
      ) : (
        <View
          key={`${entry.id}-tags`}
          wrap={false}
          minPresenceAhead={layout.entryHeadMinPresence}
        >
          <TagRow tags={tags} indented />
        </View>
      ),
    );
  }
  if (hasText(display.link)) {
    nodes.push(
      timeline ? (
        <View
          key={`${entry.id}-link`}
          style={[styles.timelineFollow, { width: pageContentWidth(pageSize) }]}
        >
          <TimelineRail />
          <View style={[styles.timelineFollowBody, { width: bodyWidth }]}>
            <Link
              src={normalizeHref(display.link)}
              style={[styles.link, styles.timelineLink]}
            >
              {displayLink(display.link)}
            </Link>
          </View>
        </View>
      ) : (
        <Link
          key={`${entry.id}-link`}
          src={normalizeHref(display.link)}
          style={[styles.link, styles.entryFollowIndent]}
        >
          {displayLink(display.link)}
        </Link>
      ),
    );
  }

  return nodes;
}

/** Grid cells stay nested — they are cells of a wrapping flex row. */
function CompactEntryBody({
  entry,
  section,
}: {
  entry: ResumeEntry;
  section: ResumeSection;
}) {
  const display = referenceDisplay(entry, section);
  const { dates, metaLine } = entryFollowLines(display.entry);
  const tags = entry.tags.filter(hasText);
  const icon = kindBadge(section.kind, section.title);

  return (
    <View>
      <EntryHeading
        entry={display.entry}
        dates={dates}
        metaLine={metaLine}
        description
        icon={icon}
      />
      {section.kind === "education" && entry.cgpa && (
        <Text key={`${entry.id}-cgpa`} style={[styles.entryMeta, styles.entryFollowIndent]}>
          CGPA {entry.cgpa}
        </Text>
      )}
      {section.kind === "education" && entry.gpa && (
        <Text key={`${entry.id}-gpa`} style={[styles.entryMeta, styles.entryFollowIndent]}>
          GPA {entry.gpa}
        </Text>
      )}
      {section.kind === "education" && entry.science && (
        <Text key={`${entry.id}-science`} style={[styles.entryMeta, styles.entryFollowIndent]}>
          {entry.science}
        </Text>
      )}
      {display.contact.length > 0 ? (
        <ReferenceContactList items={display.contact} />
      ) : null}
      {display.bullets.map((bullet, index) => (
        <View key={`${entry.id}-b-${index}`} style={styles.bulletRowIndented}>
          <Text style={styles.bulletMark}>•</Text>
          <Text style={styles.bulletText}>{bullet}</Text>
        </View>
      ))}
      {tags.length > 0 ? <TagRow tags={tags} indented /> : null}
      {hasText(display.link) ? (
        <Link
          src={normalizeHref(display.link)}
          style={[styles.link, styles.entryFollowIndent]}
        >
          {displayLink(display.link)}
        </Link>
      ) : null}
    </View>
  );
}

function referenceDisplay(entry: ResumeEntry, section: ResumeSection) {
  if (!isReferencesSectionTitle(section.title)) {
    return {
      entry,
      bullets: entry.bullets.filter(hasText),
      contact: [] as EntryContactItem[],
      link: entry.link,
    };
  }

  const extracted = extractEntryContact(entry);
  return {
    entry: {
      ...entry,
      description: extracted.description,
      location: extracted.location,
      subtitle: extracted.subtitle,
    },
    bullets: extracted.bullets,
    contact: extracted.items,
    link: extracted.link,
  };
}

/** Most referee cards that share a row; more wrap onto the next row. */
const REFERENCE_MAX_COLUMNS = 3;

/**
 * Referees as equal-width cards in rows. The column count follows how many
 * there are — one card sits at half width instead of stretching across the
 * page, two split the row, three or more fill rows of three — and a short
 * last row keeps the same card width so nothing looks stretched. Cards in a
 * row stretch to the tallest, so a card without an email still lines up.
 */
function referenceRows(
  entries: ResumeEntry[],
  section: ResumeSection,
  pageSize: PageSize,
): ReactElement[] {
  const columns = Math.min(Math.max(entries.length, 2), REFERENCE_MAX_COLUMNS);
  const cardWidth =
    (pageContentWidth(pageSize) - layout.referenceCardGap * (columns - 1)) /
    columns;
  const rows: ReactElement[] = [];
  for (let start = 0; start < entries.length; start += columns) {
    const cards = entries.slice(start, start + columns);
    rows.push(
      <View
        key={`${section.id}-ref-row-${start}`}
        style={styles.refRow}
        wrap={false}
      >
        {cards.map((entry) => (
          <ReferenceCard
            key={entry.id}
            entry={entry}
            section={section}
            width={cardWidth}
          />
        ))}
      </View>,
    );
  }
  return rows;
}

function ReferenceCard({
  entry,
  section,
  width,
}: {
  entry: ResumeEntry;
  section: ResumeSection;
  width: number;
}) {
  const display = referenceDisplay(entry, section);
  const { title, location, description } = display.entry;
  const { designation, company } = splitDesignationAndCompany(display.entry);
  const tags = entry.tags.filter(hasText);

  return (
    <View style={[styles.refCard, { width }]}>
      {hasText(title) ? (
        <Text style={styles.refName}>{title.trim()}</Text>
      ) : null}
      {hasText(designation) ? (
        <Text style={styles.refRole}>{designation}</Text>
      ) : null}
      {hasText(company) ? (
        <Text style={styles.refCompany}>{company}</Text>
      ) : null}
      {hasText(location) ? (
        <Text style={styles.refDetail}>{location.trim()}</Text>
      ) : null}
      {hasText(description) ? (
        <Text style={[styles.refDetail, { marginTop: layout.entryFollowGap }]}>
          {description.trim()}
        </Text>
      ) : null}
      {display.contact.length > 0 ? (
        <ReferenceContactList
          items={display.contact}
          style={styles.refContactCard}
        />
      ) : null}
      {display.bullets.map((bullet, index) => (
        <Text key={`${entry.id}-b-${index}`} style={styles.refDetail}>
          {`• ${bullet}`}
        </Text>
      ))}
      {tags.length > 0 ? <TagRow tags={tags} /> : null}
      {hasText(display.link) ? (
        <Link src={normalizeHref(display.link)} style={styles.link}>
          {displayLink(display.link)}
        </Link>
      ) : null}
    </View>
  );
}

function ReferenceContactList({
  items,
  style = styles.refContactList,
}: {
  items: EntryContactItem[];
  style?: Style;
}) {
  const color = colors.textMuted;
  const size = 8;

  return (
    <View style={style} wrap={false}>
      {items.map((item, index) => {
        const href = contactHref(item);
        const label =
          item.kind === "link"
            ? compactProfileLabel(item.value)
            : item.kind === "phone"
              ? formatBangladeshiPhone(item.value)
              : item.value;
        return (
          <Link
            key={`${item.kind}-${index}`}
            src={href}
            style={styles.refContactRow}
            wrap={false}
          >
            <View style={styles.refContactGlyph}>
              {contactGlyph(item, color, size)}
            </View>
            <Text style={styles.refContactValue}>{label}</Text>
          </Link>
        );
      })}
    </View>
  );
}

function contactGlyph(
  item: EntryContactItem,
  color: string,
  size: number,
): ReactNode {
  if (item.kind === "email") return <MailIcon size={size} color={color} />;
  if (item.kind === "phone") return <PhoneIcon size={size} color={color} />;
  return linkKindIcon(item.value, color, size);
}

function contactHref(item: EntryContactItem): string {
  if (item.kind === "email") return `mailto:${item.value}`;
  if (item.kind === "phone") return `tel:${item.value.replace(/[^\d+]/g, "")}`;
  return normalizeHref(item.value);
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
 * joined by SKILL_SEPARATOR. Render those as flag + name chips instead.
 */
function skillRows(
  sectionId: string,
  entries: ResumeEntry[],
  sectionKind: SectionKind,
  showSkillIcons: boolean,
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

  // Skills sections lay out as a wrapping run of chips, each with its icon
  // only when icons are on. Other tag sections keep the single line of text
  // joined by SKILL_SEPARATOR.
  const skillValues = (skills: string[]): ReactElement =>
    sectionKind === "skills" ? (
      <SkillList
        items={skills.map((label) =>
          showSkillIcons ? skillListItem(label) : { label },
        )}
        chipStyle={styles.skillChip}
        labelStyle={styles.skillChipLabel}
        iconSize={layout.skillIconSize}
        iconGap={layout.skillChipGap}
        chipGap={space[1]}
        labelOffsetTop={SKILL_LABEL_OFFSET_TOP}
      />
    ) : (
      <Text style={styles.skillValues}>{skills.join(SKILL_SEPARATOR)}</Text>
    );

  // A category is one row. wrap={false} moves the label and its chips
  // together when they do not fit, so the row never straddles a page break.
  const nodes = rows
    .filter((row) => row.skills.length > 0)
    .map((row) => (
      <View key={row.id} style={styles.skillRow} wrap={false}>
        {row.label ? <Text style={styles.skillLabel}>{row.label}</Text> : null}
        {skillValues(row.skills)}
      </View>
    ));

  if (uncategorised.length > 0) {
    nodes.push(
      <View
        key={`${sectionId}-uncategorised-skills`}
        style={styles.skillRow}
        wrap={false}
      >
        {skillValues(uncategorised)}
      </View>,
    );
  }

  return nodes;
}

function skillListItem(label: string): SkillListItem {
  return { label, icon: resolveSkillIcon(label) };
}

function TagRow({ tags, indented }: { tags: string[]; indented?: boolean }) {
  return (
    <View
      style={[styles.tagRow, indented ? styles.entryFollowIndent : undefined]}
    >
      {tags.map((tag) => (
        <View key={tag} style={styles.tag} wrap={false}>
          <Text style={styles.tagLabel}>{tag}</Text>
        </View>
      ))}
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
    hasText(entry.organization) ||
    hasText(entry.location) ||
    hasText(entry.startDate) ||
    hasText(entry.endDate) ||
    hasText(entry.description) ||
    hasText(entry.link) ||
    entry.bullets.some(hasText) ||
    entry.tags.some(hasText)
  );
}
