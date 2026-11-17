/**
 * Field paths describe a location inside ResumeData with dot-separated keys
 * and bracketed array indices, e.g. "personalInfo.fullName" or
 * "sections[0].entries[1].bullets[2]". Both inline canvas editing
 * (lib/editor/fieldMatch.ts) and import fixes (lib/import/applyFixes.ts)
 * resolve these paths, so parsing lives here and must not drift.
 */

/** One step of a field path — an object key or an array index. */
export type PathSegment = { key: string } | { index: number };

/**
 * Parses "sections[0].entries[1].bullets[2]" into
 * [sections, 0, entries, 1, bullets, 2]. Splitting on "." alone would glue
 * "sections[0]" into one token and lose every index.
 */
export function parseFieldPath(path: string): PathSegment[] {
  const segments: PathSegment[] = [];
  for (const match of path.matchAll(/([^.[\]]+)|\[(\d+)\]/g)) {
    if (match[1] !== undefined) {
      segments.push({ key: match[1] });
    } else {
      segments.push({ index: Number.parseInt(match[2], 10) });
    }
  }
  return segments;
}

/** Inverse of parseFieldPath — "sections[1].entries[2]" from segments. */
export function formatFieldPath(segments: readonly PathSegment[]): string {
  let path = "";
  for (const segment of segments) {
    if ("key" in segment) {
      path = path ? `${path}.${segment.key}` : segment.key;
    } else {
      path = `${path}[${segment.index}]`;
    }
  }
  return path;
}
