/**
 * Truncates a filename to at most `maxLength` characters by dropping from
 * the middle of the base name — never the extension, so the file's format
 * stays visible (e.g. "My_Really_Long…sion_2024.pdf" rather than
 * "My_Really_Long_Professional_R…", which hides the ".pdf"). Returns
 * `name` unchanged if it already fits.
 */
export function truncateFilenameMiddle(name: string, maxLength: number): string {
  if (maxLength <= 0 || name.length <= maxLength) return name;

  const ELLIPSIS = "…";
  const dotIndex = name.lastIndexOf(".");
  // Only treat it as an extension when there's a non-empty base before the
  // dot and something after it — guards ".gitignore"-style leading dots.
  const hasExtension = dotIndex > 0 && dotIndex < name.length - 1;
  const extension = hasExtension ? name.slice(dotIndex) : "";
  const base = hasExtension ? name.slice(0, dotIndex) : name;

  const budget = maxLength - extension.length - ELLIPSIS.length;
  if (budget <= 0) {
    // maxLength too small even for one base character plus the ellipsis —
    // fall back to a plain end truncation of the whole string.
    return name.slice(0, Math.max(0, maxLength - 1)) + ELLIPSIS;
  }

  const headLength = Math.ceil(budget / 2);
  const tailLength = Math.floor(budget / 2);
  const head = base.slice(0, headLength);
  const tail = tailLength > 0 ? base.slice(base.length - tailLength) : "";

  return `${head}${ELLIPSIS}${tail}${extension}`;
}
