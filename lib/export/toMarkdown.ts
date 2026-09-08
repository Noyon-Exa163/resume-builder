import type { ResumeData } from "@/lib/schema/resume";
import {
  contactLine,
  entryHasContent,
  hasText,
  visibleSections,
} from "./shared";
import { formatDateRange } from "@/lib/date";
import { normalizeHeadline } from "@/lib/schema/headline";
import { formatFullNameForDisplay } from "@/lib/schema/personalInfo";

/**
 * Renders a resume as Markdown — a pure string transform over ResumeData,
 * no design fidelity intended. Best-effort formatting, not a branded
 * template replica (same spirit as toDocx.ts).
 */
export function toMarkdown(data: ResumeData): string {
  const { personalInfo, summary, meta } = data;
  const lines: string[] = [];

  if (hasText(personalInfo.fullName)) {
    lines.push(
      `# ${formatFullNameForDisplay(personalInfo.fullName, meta.nameCasing)}`,
    );
  }
  const headline = normalizeHeadline(personalInfo.headline);
  if (hasText(headline)) lines.push(headline);
  const contact = contactLine(personalInfo);
  if (contact) lines.push(contact);
  lines.push("");

  if (hasText(summary)) {
    lines.push("## Summary", "", summary.trim(), "");
  }

  for (const section of visibleSections(data)) {
    lines.push(`## ${section.title}`, "");
    const entries = section.entries.filter(entryHasContent);

    if (section.layout === "tags") {
      for (const entry of entries) {
        const tags = entry.tags.filter(hasText);
        if (hasText(entry.title) && tags.length > 0) {
          lines.push(`**${entry.title}:** ${tags.join(", ")}`);
        } else if (tags.length > 0) {
          lines.push(tags.join(", "));
        } else if (hasText(entry.title)) {
          lines.push(entry.title);
        }
      }
      lines.push("");
      continue;
    }

    for (const entry of entries) {
      const header = [entry.title, entry.subtitle].filter(hasText).join(" — ");
      if (header) lines.push(`**${header}**`);

      const dateAndLocation = [formatDateRange(entry), entry.location]
        .filter(hasText)
        .join(" · ");
      if (dateAndLocation) lines.push(dateAndLocation);

      if (hasText(entry.description)) lines.push(entry.description.trim());

      for (const bullet of entry.bullets.filter(hasText)) {
        lines.push(`- ${bullet}`);
      }

      if (hasText(entry.link)) lines.push(entry.link.trim());

      lines.push("");
    }
  }

  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}
