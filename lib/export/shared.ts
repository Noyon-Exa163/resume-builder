import type { ResumeData, ResumeEntry, ResumeSection } from "@/lib/schema/resume";
import { phonesForDisplay } from "@/lib/contact";

/**
 * Formatting decisions shared by the plain-text exporters (Markdown, DOCX)
 * so "bullets vs. tags vs. date range" logic lives in one place rather than
 * drifting between two independent best-effort formatters.
 */

export function hasText(value: string | undefined): value is string {
  return typeof value === "string" && value.trim() !== "";
}

export function entryHasContent(entry: ResumeEntry): boolean {
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

export function sectionHasContent(section: ResumeSection): boolean {
  return hasText(section.title) || section.entries.some(entryHasContent);
}

/** False for a freshly created resume nothing has been typed or imported
 *  into yet — every personal-info field, the summary and all sections are
 *  empty. */
export function resumeHasContent(data: ResumeData): boolean {
  return (
    Object.values(data.personalInfo).some(hasText) ||
    hasText(data.summary) ||
    data.sections.some(sectionHasContent)
  );
}

export function visibleSections(data: ResumeData): ResumeSection[] {
  return data.sections.filter((s) => s.visible && sectionHasContent(s));
}

export function contactLine(
  info: ResumeData["personalInfo"],
  showAlternatePhone: boolean,
): string {
  return [
    info.email,
    ...phonesForDisplay(info.phone, showAlternatePhone),
    info.location,
    info.website,
    info.linkedin,
    info.github,
  ]
    .filter(hasText)
    .join(" · ");
}
