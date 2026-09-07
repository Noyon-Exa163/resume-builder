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

export function visibleSections(data: ResumeData): ResumeSection[] {
  return data.sections.filter((s) => s.visible && sectionHasContent(s));
}

export function contactLine(info: ResumeData["personalInfo"]): string {
  return [
    info.email,
    ...phonesForDisplay(info.phone),
    info.location,
    info.website,
    info.linkedin,
    info.github,
  ]
    .filter(hasText)
    .join(" · ");
}
