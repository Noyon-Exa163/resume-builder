/**
 * Compact labels for the resume header. The icon and caption name the
 * network, so LinkedIn/GitHub show only the unique path.
 */

export function compactProfileLabel(value: string): string {
  const stripped = value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");

  const linkedin = stripped.match(
    /^(?:[a-z]{2,3}\.)?linkedin\.com\/(in\/[^/?#]+)/i,
  );
  if (linkedin) return decodeURIComponent(linkedin[1]);

  const github = stripped.match(/^(?:www\.)?github\.com\/([^/?#]+)/i);
  if (github) return github[1];

  return stripped;
}

/** Conservative glyph budget for Inter at `fontSizePt` in a fixed column. */
export function maxCharsForWidth(widthPt: number, fontSizePt: number): number {
  return Math.max(8, Math.floor(widthPt / (fontSizePt * 0.55)));
}

/**
 * Inserts a real newline when a value is too long for its column.
 * Emails split at `@`; paths and addresses split at `/`, comma, or hyphen.
 */
export function breakContactValue(value: string, maxChars: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxChars) return trimmed;

  const at = trimmed.lastIndexOf("@");
  if (at > 0 && at < trimmed.length - 1) {
    return `${trimmed.slice(0, at)}\n@${trimmed.slice(at + 1)}`;
  }

  return wrapAtSeparators(trimmed, maxChars);
}

function wrapAtSeparators(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;

  const window = value.slice(0, maxChars);
  const comma = window.lastIndexOf(",");
  const slash = window.lastIndexOf("/");
  const space = window.lastIndexOf(" ");
  const hyphen = Math.max(window.lastIndexOf("-"), window.lastIndexOf("_"));

  let index = -1;
  let keepSep = false;
  if (comma >= 0) {
    index = comma;
  } else if (slash >= 0) {
    index = slash;
    keepSep = true;
  } else if (space >= 0) {
    index = space;
  } else if (hyphen > 0) {
    index = hyphen;
  }

  if (index <= 0) {
    return `${value.slice(0, maxChars)}\n${value.slice(maxChars)}`;
  }

  const head = value
    .slice(0, keepSep ? index + 1 : index)
    .replace(/[,\s]+$/, "");
  const tail = value.slice(keepSep ? index + 1 : index).replace(/^[,\s]+/, "");
  if (!head || !tail || head === value) {
    return `${value.slice(0, maxChars)}\n${value.slice(maxChars)}`;
  }
  return `${head}\n${wrapAtSeparators(tail, maxChars)}`;
}
