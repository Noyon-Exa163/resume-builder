import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatDateRange } from "@/lib/date";
import type { PageSize, ResumeEntry, ResumeSection } from "@/lib/schema/resume";
import type { ResumeTemplateProps } from "../types";
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
  header: { marginBottom: space[4] },
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
  summary: { marginBottom: space[4] },
  summaryText: { fontSize: fonts.sizeBody, color: colors.text },
  section: { marginBottom: space[4] },
  sectionHeader: { marginBottom: space[2] },
  sectionTitle: {
    fontSize: fonts.sizeSection,
    fontWeight: 700,
    letterSpacing: fonts.letterSpacingSection,
    textTransform: "uppercase",
    color: colors.text,
  },
  sectionRule: {
    marginTop: space[1],
    height: layout.sectionRuleHeight,
    backgroundColor: colors.rule,
  },
  entry: { marginBottom: space[3] },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: space[2],
  },
  entryTitle: { flex: 1, fontSize: fonts.sizeBody, fontWeight: 700, color: colors.text },
  entryDates: { fontSize: fonts.sizeSmall, color: colors.textMuted, textAlign: "right" },
  entryTitleSpacer: { flex: 1 },
  entryMeta: {
    marginTop: space[1] / 2,
    fontSize: fonts.sizeSmall,
    color: colors.textSecondary,
  },
  entryDescription: { marginTop: space[1], fontSize: fonts.sizeBody, color: colors.text },
  bulletRow: { flexDirection: "row", marginTop: space[1], paddingLeft: space[2] },
  bulletMark: { width: layout.bulletMarkWidth, fontSize: fonts.sizeBody, color: colors.text },
  bulletText: { flex: 1, fontSize: fonts.sizeBody, color: colors.text },
  link: { marginTop: space[1], fontSize: fonts.sizeSmall, color: colors.text },
  tagLine: { marginTop: space[1], fontSize: fonts.sizeBody, color: colors.text },
});

/**
 * Deliberately simpler than ExabyingDocument: single column, no logo/photo,
 * and every section renders the same "list" way regardless of `layout` —
 * proving the registry doesn't require a template to support every layout
 * mode, just the shared Document/data contract in templates/types.ts.
 */
export function MinimalDocument({ data }: ResumeTemplateProps) {
  const { personalInfo, summary, sections, meta } = data;
  const visibleSections = sections.filter(
    (section) => section.visible && sectionHasContent(section),
  );

  return (
    <Document title={meta.title} author={personalInfo.fullName || undefined}>
      <Page size={PDF_PAGE_SIZE[meta.pageSize]} style={styles.page} wrap>
        <View style={styles.header}>
          {hasText(personalInfo.fullName) ? (
            <Text style={styles.name}>{personalInfo.fullName}</Text>
          ) : null}
          {hasText(personalInfo.headline) ? (
            <Text style={styles.headline}>{personalInfo.headline}</Text>
          ) : null}
          {contactLine(personalInfo) ? (
            <Text style={styles.contact}>{contactLine(personalInfo)}</Text>
          ) : null}
        </View>

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

function SectionHeading({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader} wrap={false} minPresenceAhead={layout.sectionHeaderMinPresence}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

function SectionBlock({ section }: { section: ResumeSection }) {
  const entries = section.entries.filter(entryHasContent);
  return (
    <View style={styles.section}>
      <SectionHeading title={section.title} />
      {entries.map((entry) => (
        <View key={entry.id} style={styles.entry}>
          <EntryBody entry={entry} />
        </View>
      ))}
    </View>
  );
}

function EntryBody({ entry }: { entry: ResumeEntry }) {
  const dates = formatDateRange(entry);
  const metaLine = [entry.subtitle, entry.location].filter(hasText).join("  ·  ");
  const bullets = entry.bullets.filter(hasText);
  const tags = entry.tags.filter(hasText);

  return (
    <View>
      <View style={styles.entryHeader}>
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
      {bullets.map((bullet, index) => (
        <View key={`${entry.id}-b-${index}`} style={styles.bulletRow}>
          <Text style={styles.bulletMark}>-</Text>
          <Text style={styles.bulletText}>{bullet}</Text>
        </View>
      ))}
      {tags.length > 0 ? <Text style={styles.tagLine}>{tags.join(", ")}</Text> : null}
      {hasText(entry.link) ? <Text style={styles.link}>{displayLink(entry.link)}</Text> : null}
    </View>
  );
}

function contactLine(info: ResumeTemplateProps["data"]["personalInfo"]): string {
  return [
    info.email,
    info.phone,
    info.location,
    info.website ? displayLink(info.website) : undefined,
    info.linkedin ? displayLink(info.linkedin) : undefined,
    info.github ? displayLink(info.github) : undefined,
  ]
    .filter(hasText)
    .join("  ·  ");
}

function displayLink(value: string): string {
  return value.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function hasText(value: string | undefined): value is string {
  return typeof value === "string" && value.trim() !== "";
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
