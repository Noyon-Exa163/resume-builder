import { fixBrandCasingDeep } from "@/lib/schema/brandCasing";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { ResumeData } from "@/lib/schema/resume";
import {
  contactLine,
  entryHasContent,
  hasText,
  visibleSections,
} from "./shared";
import { formatDateRange } from "@/lib/date";
import { entrySubtitle } from "@/lib/schema/entryOrganization";
import { normalizeHeadline } from "@/lib/schema/headline";
import { formatFullNameForDisplay } from "@/lib/schema/personalInfo";

/**
 * Renders a resume as a .docx file — best-effort formatting via the same
 * section walk as toMarkdown.ts, not a branded-template replica. Runs
 * entirely client-side (`docx`'s Packer.toBlob()), no export API route.
 */
export async function toDocx(source: ResumeData): Promise<Blob> {
  const data = fixBrandCasingDeep(source);
  const { personalInfo, summary, meta } = data;
  const children: Paragraph[] = [];

  if (hasText(personalInfo.fullName)) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [
          new TextRun(
            formatFullNameForDisplay(personalInfo.fullName, meta.nameCasing),
          ),
        ],
      }),
    );
  }
  const headline = normalizeHeadline(personalInfo.headline);
  if (hasText(headline)) {
    children.push(new Paragraph({ children: [new TextRun(headline)] }));
  }
  const contact = contactLine(personalInfo, meta.alternatePhoneVisible);
  if (contact) {
    children.push(new Paragraph({ children: [new TextRun(contact)] }));
  }

  if (hasText(summary)) {
    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Summary")] }),
      new Paragraph({ children: [new TextRun(summary.trim())] }),
    );
  }

  for (const section of visibleSections(data)) {
    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(section.title)] }),
    );
    const entries = section.entries.filter(entryHasContent);

    if (section.layout === "tags") {
      for (const entry of entries) {
        const tags = entry.tags.filter(hasText);
        const text =
          hasText(entry.title) && tags.length > 0
            ? `${entry.title}: ${tags.join(", ")}`
            : tags.length > 0
              ? tags.join(", ")
              : entry.title;
        if (hasText(text)) {
          children.push(new Paragraph({ children: [new TextRun(text)] }));
        }
      }
      continue;
    }

    for (const entry of entries) {
      const header = [entry.title, entrySubtitle(entry)].filter(hasText).join(" — ");
      if (header) {
        children.push(
          new Paragraph({ children: [new TextRun({ text: header, bold: true })] }),
        );
      }

      const dateAndLocation = [formatDateRange(entry), entry.location]
        .filter(hasText)
        .join(" · ");
      if (dateAndLocation) {
        children.push(new Paragraph({ children: [new TextRun(dateAndLocation)] }));
      }

      if (hasText(entry.description)) {
        children.push(new Paragraph({ children: [new TextRun(entry.description.trim())] }));
      }

      for (const bullet of entry.bullets.filter(hasText)) {
        children.push(
          new Paragraph({ bullet: { level: 0 }, children: [new TextRun(bullet)] }),
        );
      }

      if (hasText(entry.link)) {
        children.push(new Paragraph({ children: [new TextRun(entry.link.trim())] }));
      }
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}
