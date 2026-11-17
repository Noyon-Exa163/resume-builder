import type { DeepPartial } from "@/lib/schema/normalize";
import type { ResumeData, SectionKind } from "@/lib/schema/resume";

export type IssueSeverity = "error" | "warning" | "info";

/** A confident one-click correction for an issue. "set" writes `value` at
 *  the issue's path; "remove" deletes it (a key like endDate, or a whole
 *  array element like an empty section). */
export type ImportIssueFix =
  | { action: "set"; value: string }
  | { action: "remove" };

export interface ImportIssue {
  id: string;
  /** Human-readable description of the problem. */
  message: string;
  /** Severity: error blocks commit until fixed/ignored; warning/info are advisory. */
  severity: IssueSeverity;
  /** Dot-path into the resume data, e.g. "personalInfo.email" or "sections[0].entries[1].startDate". */
  field: string;
  /** The currently extracted (problematic) value, if any. */
  currentValue: unknown;
  /** One-click correction, when one can be proposed confidently. Absent
   *  means the user has to type the value themselves — only Ignore applies. */
  fix?: ImportIssueFix;
}

/** Detects wrong or inconsistent information right after extraction, before
 * anything is committed to the resume. Returns zero or more issues the user
 * should review.
 */
export function flagImportIssues(
  partial: DeepPartial<ResumeData>,
): ImportIssue[] {
  const issues: ImportIssue[] = [];
  const sections = partial.sections ?? [];

  // --- Personal info ---
  const personalInfo = partial.personalInfo ?? {};
  const fullName = personalInfo.fullName?.trim();
  if (!fullName) {
    issues.push({
      id: "missing-full-name",
      message: "No name was found on the resume. Add one so the document has a clear owner.",
      field: "personalInfo.fullName",
      currentValue: personalInfo.fullName ?? null,
      severity: "error",
    });
  }

  const email = personalInfo.email?.trim();
  if (email && !isValidEmail(email)) {
    const cleaned = cleanEmail(email);
    issues.push({
      id: "invalid-email",
      message: `The email "${email}" doesn't look like a valid address.`,
      field: "personalInfo.email",
      currentValue: email,
      severity: "error",
      ...(cleaned
        ? { fix: { action: "set" as const, value: cleaned } }
        : {}),
    });
  }
  if (!email) {
    issues.push({
      id: "missing-email",
      message: "No email address was found. Recruiters use this to contact you.",
      field: "personalInfo.email",
      currentValue: null,
      severity: "warning",
    });
  }

  const phone = personalInfo.phone?.trim();
  if (phone && !isValidPhone(phone)) {
    issues.push({
      id: "invalid-phone",
      message: `The phone number "${phone}" looks incomplete or malformed.`,
      field: "personalInfo.phone",
      currentValue: phone,
      severity: "warning",
    });
  }

  // --- Sections ---
  let emptySectionCount = 0;
  const seenTitles = new Set<string>();

  sections.forEach((section, sectionIndex) => {
    const sectionPrefix = `sections[${sectionIndex}]`;
    const title = (section?.title ?? "").trim();
    const kind = section?.kind as SectionKind | undefined;

    if (!title) {
      issues.push({
        id: `empty-section-title-${sectionIndex}`,
        message: `Section ${sectionIndex + 1} has no title.`,
        field: `${sectionPrefix}.title`,
        currentValue: section?.title ?? null,
        severity: "warning",
        fix: {
          action: "set",
          value: defaultTitleForKind(kind),
        },
      });
    } else if (seenTitles.has(title.toLowerCase())) {
      issues.push({
        id: `duplicate-section-title-${sectionIndex}`,
        message: `Two sections are both titled "${title}". Merge them or rename one.`,
        field: `${sectionPrefix}.title`,
        currentValue: title,
        severity: "warning",
        fix: { action: "set", value: `${title} (2)` },
      });
    } else {
      seenTitles.add(title.toLowerCase());
    }

    const entries = section?.entries ?? [];
    if (entries.length === 0) {
      emptySectionCount += 1;
      issues.push({
        id: `empty-section-${sectionIndex}`,
        message: `The "${title || "Untitled"}" section is empty. Add entries or remove it.`,
        field: sectionPrefix,
        currentValue: [],
        severity: "info",
        fix: { action: "remove" },
      });
    }

    entries.forEach((entry, entryIndex) => {
      const entryPrefix = `${sectionPrefix}.entries[${entryIndex}]`;
      const entryTitle = (entry?.title ?? "").trim();
      const startDate = entry?.startDate?.trim();
      const endDate = entry?.endDate?.trim();
      const isCurrent = entry?.isCurrent;

      if (!entryTitle && !entry?.subtitle) {
        issues.push({
          id: `empty-entry-${sectionIndex}-${entryIndex}`,
          message: `An entry in "${title || "Untitled"}" has no title or role.`,
          field: entryPrefix,
          currentValue: entry?.title ?? null,
          severity: "info",
          fix: { action: "remove" },
        });
      }

      // Date-range consistency: end before start
      if (startDate && endDate && !isCurrent) {
        const start = parseDate(startDate);
        const end = parseDate(endDate);
        if (start && end && end < start) {
          issues.push({
            id: `date-range-reversed-${sectionIndex}-${entryIndex}`,
            message: `The end date "${endDate}" is before the start date "${startDate}" in "${entryTitle || "an entry"}".`,
            field: `${entryPrefix}.endDate`,
            currentValue: endDate,
            severity: "error",
          });
        }
      }

      // "Present" / current with an end date is contradictory
      if (isCurrent && endDate) {
        issues.push({
          id: `current-with-end-date-${sectionIndex}-${entryIndex}`,
          message: `“${entryTitle || "An entry"}” is marked current but also has an end date (“${endDate}”). Remove the end date or unmark it as current.`,
          field: `${entryPrefix}.endDate`,
          currentValue: endDate,
          severity: "warning",
          fix: { action: "remove" },
        });
      }

      // No dates at all on an experience/education entry
      if (
        (kind === "experience" || kind === "education") &&
        !startDate &&
        !endDate
      ) {
        issues.push({
          id: `no-dates-${sectionIndex}-${entryIndex}`,
          message: `“${entryTitle || "An entry"}” has no dates. Add when you worked or studied there.`,
          field: `${entryPrefix}.startDate`,
          currentValue: null,
          severity: "info",
        });
      }

      // No bullets on a non-skill entry
      if (
        kind !== "skills" &&
        kind !== "languages" &&
        kind !== "certifications" &&
        kind !== "awards" &&
        entry?.bullets?.length === 0 &&
        !entry?.description
      ) {
        issues.push({
          id: `no-content-${sectionIndex}-${entryIndex}`,
          message: `“${entryTitle || "An entry"}” has no description or bullets. Add what you did there.`,
          field: `${entryPrefix}.bullets`,
          currentValue: null,
          severity: "info",
        });
      }
    });
  });

  if (emptySectionCount === sections.length && sections.length > 0) {
    issues.unshift({
      id: "all-sections-empty",
      message: "Every section is empty — nothing was extracted from this file. Try a different file or paste the text instead.",
      field: "sections",
      currentValue: sections,
      severity: "error",
    });
  }

  return issues;
}

function isValidEmail(value: string): boolean {
  // Local@domain.tld with no whitespace and none of the punctuation that
  // shows up when an address is pasted with surrounding formatting.
  return /^[^\s@<>,;:"']+@[^\s@<>,;:"']+\.[^\s@<>,;:"']+$/.test(value);
}

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7;
}

/**
 * Best-effort email repair for a one-click fix: strips a pasted mailto:
 * prefix and surrounding punctuation. Returns null when nothing obvious is
 * wrong beyond the shape itself — guessing at repairs (e.g. domain typos)
 * would risk silently inventing an unreachable address.
 */
function cleanEmail(value: string): string | null {
  const cleaned = value
    .trim()
    .replace(/^mailto:/i, "")
    .replace(/^[<("']+|[>)"',.;]+$/g, "");
  return cleaned !== value && isValidEmail(cleaned) ? cleaned : null;
}

/** A sensible section title for a kind, for the one-click fix on untitled
 *  sections. */
function defaultTitleForKind(kind: SectionKind | undefined): string {
  const titles: Record<SectionKind, string> = {
    experience: "Experience",
    education: "Education",
    skills: "Skills",
    projects: "Projects",
    certifications: "Certifications",
    languages: "Languages",
    awards: "Awards",
    custom: "Untitled Section",
  };
  return (kind && titles[kind]) || "Untitled Section";
}

/** Parses "Jan 2020", "2020", "Jan 2020 – Dec 2024" etc. Returns a comparable
 * timestamp or null when it can't be parsed. */
function parseDate(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) return parsed;

  // Try "Month Year" → append day 1
  const monthYear = trimmed.match(/^(\w+)\s+(\d{4})$/i);
  if (monthYear) {
    const parsedMonthYear = Date.parse(`1 ${monthYear[1]} ${monthYear[2]}`);
    if (!Number.isNaN(parsedMonthYear)) return parsedMonthYear;
  }

  // Bare year
  const bareYear = trimmed.match(/^(\d{4})$/);
  if (bareYear) {
    return Date.parse(`1 Jan ${bareYear[1]}`);
  }

  return null;
}
