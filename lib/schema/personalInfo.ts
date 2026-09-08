import type { NameCasing } from "./resume";

/** Capitalizes the first letter of each word, lowercasing the rest — used
 *  both for the "Title Case" name display option and for building export
 *  filenames (lib/export/filename.ts), so both stay in exact agreement. */
export function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Formats a person's name for display in the resume document itself (PDF,
 * DOCX, Markdown) according to the resume's `meta.nameCasing` setting —
 * never call this on the value going into storage or the editor's Full Name
 * input, only at the point a template/export renders the name.
 */
export function formatFullNameForDisplay(
  fullName: string,
  casing: NameCasing,
): string {
  return casing === "titleCase" ? toTitleCase(fullName) : fullName.toUpperCase();
}
