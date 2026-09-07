import {
  Document,
  Image as PdfImage,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { formatDateRange } from "@/lib/date";
import type { PageSize, ResumeEntry, ResumeSection } from "@/lib/schema/resume";
import type { ResumeTemplateProps } from "../types";
import { ExabytingLogomark } from "./Logo";
import { colors, fonts, layout, space } from "./tokens";

const PDF_PAGE_SIZE: Record<PageSize, "A4" | "LETTER"> = {
  A4: "A4",
  Letter: "LETTER",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: fonts.family,
    fontSize: fonts.sizeBody,
    lineHeight: fonts.lineHeightBody,
    color: colors.text,
    backgroundColor: colors.surface,
    paddingTop: layout.pagePaddingY,
    paddingBottom: layout.pagePaddingY,
    paddingHorizontal: layout.pagePaddingX,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space[3],
    marginBottom: space[4],
  },
  photo: {
    width: layout.photoSize,
    height: layout.photoSize,
    borderRadius: layout.photoRadius,
    objectFit: "cover",
  },
  headerMain: {
    flex: 1,
    flexDirection: "column",
  },
  logo: {
    width: layout.logoSize,
    height: layout.logoSize,
  },
  name: {
    fontSize: fonts.sizeName,
    fontWeight: 700,
    lineHeight: fonts.lineHeightName,
    color: colors.text,
  },
  headline: {
    marginTop: space[1],
    fontSize: fonts.sizeHeadline,
    color: colors.textSecondary,
  },
  contact: {
    marginTop: space[2],
    fontSize: fonts.sizeSmall,
    color: colors.textMuted,
  },
  summary: {
    marginBottom: space[4],
  },
  summaryText: {
    fontSize: fonts.sizeBody,
    color: colors.text,
  },
  section: {
    marginBottom: space[4],
  },
  sectionHeader: {
    marginBottom: space[2],
  },
  sectionTitle: {
    fontSize: fonts.sizeSection,
    fontWeight: 700,
    letterSpacing: fonts.letterSpacingSection,
    textTransform: "uppercase",
    color: colors.brand,
  },
  sectionRule: {
    marginTop: space[1],
    height: layout.sectionRuleHeight,
    backgroundColor: colors.brand,
  },
  entry: {
    marginBottom: space[3],
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: space[2],
  },
  entryTitle: {
    flex: 1,
    fontSize: fonts.sizeBody,
    fontWeight: 700,
    color: colors.text,
  },
  entryDates: {
    fontSize: fonts.sizeSmall,
    color: colors.textMuted,
    textAlign: "right",
  },
  entryTitleSpacer: {
    flex: 1,
  },
  entryMeta: {
    marginTop: space[1] / 2,
    fontSize: fonts.sizeSmall,
    color: colors.textSecondary,
  },
  entryDescription: {
    marginTop: space[1],
    fontSize: fonts.sizeBody,
    color: colors.text,
  },
  bulletRow: {
    flexDirection: "row",
    marginTop: space[1],
    paddingLeft: space[2],
  },
  bulletMark: {
    width: layout.bulletMarkWidth,
    fontSize: fonts.sizeBody,
    color: colors.text,
  },
  bulletText: {
    flex: 1,
    fontSize: fonts.sizeBody,
    color: colors.text,
  },
  link: {
    marginTop: space[1],
    fontSize: fonts.sizeSmall,
    color: colors.brand,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -space[1],
  },
  gridCell: {
    width: layout.gridCellWidth,
    paddingHorizontal: space[1],
    marginBottom: space[2],
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space[1],
    marginTop: space[1],
  },
  tag: {
    backgroundColor: colors.tagBackground,
    borderRadius: layout.tagRadius,
    paddingHorizontal: layout.tagPadX,
    paddingVertical: layout.tagPadY,
  },
  tagLabel: {
    fontSize: fonts.sizeTag,
    color: colors.tagText,
  },
  categoryLabel: {
    fontSize: fonts.sizeSmall,
    fontWeight: 700,
    color: colors.textSecondary,
    marginTop: space[1],
  },
});

export function ExabyingDocument({ data }: ResumeTemplateProps) {
  const { personalInfo, summary, sections, meta } = data;
  const visibleSections = sections.filter(
    (section) => section.visible && sectionHasContent(section),
  );

  return (
    <Document title={meta.title} author={personalInfo.fullName || undefined}>
      <Page size={PDF_PAGE_SIZE[meta.pageSize]} style={styles.page} wrap>
        <Header personalInfo={personalInfo} />
        {hasText(summary) ? (
          <View style={styles.summary}>
            <SectionHeading title="Summary" />
            <Text style={styles.summaryText}>{summary}</Text>
          </View>
        ) : null}
        {visibleSections.map((section) => (
          <SectionBlock key={section.id} section={section} />
        ))}
      </Page>
    </Document>
  );
}

function Header({
  personalInfo,
}: {
  personalInfo: ResumeTemplateProps["data"]["personalInfo"];
}) {
  const photoSrc = isRenderableImageSrc(personalInfo.photoDataUrl)
    ? personalInfo.photoDataUrl.trim()
    : null;
  const contact = contactLine(personalInfo);

  return (
    <View style={styles.header} wrap={false}>
      {photoSrc ? <PdfImage src={photoSrc} style={styles.photo} /> : null}
      <View style={styles.headerMain}>
        {hasText(personalInfo.fullName) ? (
          <Text style={styles.name}>{personalInfo.fullName}</Text>
        ) : null}
        {hasText(personalInfo.headline) ? (
          <Text style={styles.headline}>{personalInfo.headline}</Text>
        ) : null}
        {contact ? <Text style={styles.contact}>{contact}</Text> : null}
      </View>
      <View style={styles.logo}>
        <ExabytingLogomark />
      </View>
    </View>
  );
}

function SectionBlock({ section }: { section: ResumeSection }) {
  const entries = section.entries.filter(entryHasContent);

  return (
    <View style={styles.section}>
      <SectionHeading title={section.title} />
      {section.layout === "grid" ? (
        <View style={styles.grid}>
          {entries.map((entry) => (
            <View key={entry.id} style={styles.gridCell}>
              <EntryBody entry={entry} compact />
            </View>
          ))}
        </View>
      ) : null}
      {section.layout === "tags" ? <TagsLayout entries={entries} /> : null}
      {section.layout === "list"
        ? entries.map((entry) => (
            <View key={entry.id} style={styles.entry}>
              <EntryBody entry={entry} />
            </View>
          ))
        : null}
    </View>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <View
      style={styles.sectionHeader}
      wrap={false}
      minPresenceAhead={layout.sectionHeaderMinPresence}
    >
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

function EntryBody({
  entry,
  compact = false,
}: {
  entry: ResumeEntry;
  compact?: boolean;
}) {
  const dates = formatDateRange(entry);
  const metaLine = [entry.subtitle, entry.location]
    .filter(hasText)
    .join("  ·  ");
  const bullets = entry.bullets.filter(hasText);
  const tags = entry.tags.filter(hasText);

  return (
    <View>
      <View style={styles.entryHeader} wrap={false}>
        {hasText(entry.title) ? (
          <Text style={styles.entryTitle}>{entry.title}</Text>
        ) : (
          <View style={styles.entryTitleSpacer} />
        )}
        {dates ? <Text style={styles.entryDates}>{dates}</Text> : null}
      </View>
      {metaLine ? <Text style={styles.entryMeta}>{metaLine}</Text> : null}
      {hasText(entry.description) ? (
        <Text style={styles.entryDescription}>{entry.description}</Text>
      ) : null}
      {!compact
        ? bullets.map((bullet, index) => (
            <View key={`${entry.id}-b-${index}`} style={styles.bulletRow}>
              <Text style={styles.bulletMark}>•</Text>
              <Text style={styles.bulletText}>{bullet}</Text>
            </View>
          ))
        : null}
      {tags.length > 0 ? <TagRow tags={tags} /> : null}
      {hasText(entry.link) ? (
        <Text style={styles.link}>{displayLink(entry.link)}</Text>
      ) : null}
    </View>
  );
}

function TagsLayout({ entries }: { entries: ResumeEntry[] }) {
  return (
    <View>
      {entries.map((entry) => {
        const tags = entry.tags.filter(hasText);
        const titleIsTag = hasText(entry.title) && tags.length === 0;

        return (
          <View key={entry.id}>
            {hasText(entry.title) && !titleIsTag ? (
              <Text style={styles.categoryLabel}>{entry.title}</Text>
            ) : null}
            {titleIsTag ? <TagRow tags={[entry.title]} /> : null}
            {tags.length > 0 ? <TagRow tags={tags} /> : null}
          </View>
        );
      })}
    </View>
  );
}

function TagRow({ tags }: { tags: string[] }) {
  return (
    <View style={styles.tagRow}>
      {tags.map((tag) => (
        <View key={tag} style={styles.tag} wrap={false}>
          <Text style={styles.tagLabel}>{tag}</Text>
        </View>
      ))}
    </View>
  );
}

function contactLine(
  info: ResumeTemplateProps["data"]["personalInfo"],
): string {
  const parts = [
    info.email,
    info.phone,
    info.location,
    info.website ? displayLink(info.website) : undefined,
    info.linkedin ? displayLink(info.linkedin) : undefined,
    info.github ? displayLink(info.github) : undefined,
  ].filter(hasText);

  return parts.join("  ·  ");
}

function displayLink(value: string): string {
  return value.replace(/^https?:\/\//i, "").replace(/\/$/, "");
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
