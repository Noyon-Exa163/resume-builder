import type { ResumeData } from "@/lib/schema/resume";

const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]/g;

/**
 * Shared export filename builder — used by the editor's Export menu and the
 * dashboard's per-card download button, so both name a file the same way.
 * e.g. "ada lovelace" -> "Exabyting-Ada-Lovelace-Resume"
 */
export function buildExportFilename(data: ResumeData): string {
  const rawName =
    data.personalInfo.fullName?.trim() || data.meta.title?.trim() || "Resume";
  const cleaned = rawName.replace(INVALID_FILENAME_CHARS, "").trim();
  const titleCased = toTitleCase(cleaned) || "Resume";
  const slug = titleCased.replace(/\s+/g, "-");
  return `Exabyting-${slug}-Resume`;
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
