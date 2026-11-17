import type { ResumeData, ResumeEntry } from "@/lib/schema/resume";
import { parseFieldPath } from "@/lib/utils/dataPath";
import { digitsOnly } from "@/lib/contact/system";
import {
  parseResumeDate,
  type ResumeDateParts,
} from "@/lib/date/resumeDate";

/**
 * Maps clicked text in the rendered PDF preview back to the ResumeData field
 * it came from, and builds the store update that edits that field. The paths
 * use the same dot/index notation as lib/import/errorFlagging.ts, e.g.
 * "personalInfo.fullName" or "sections[0].entries[1].bullets[2]".
 */

export interface EditableField {
  /** Path into the resume data, e.g. "sections[0].entries[1].title". */
  field: string;
  /** The current value of the field. */
  currentValue: string;
  /** Human-readable label for the field. */
  label: string;
}

/**
 * Traverses ResumeData to find all leaf string fields that are editable from
 * the canvas (personal info, summary, section titles, entry fields, bullets,
 * tags) — everything a template prints as text.
 */
function collectEditableFields(data: ResumeData): EditableField[] {
  const fields: EditableField[] = [];

  const pi = data.personalInfo;
  const personalFields: Array<[keyof ResumeData["personalInfo"], string]> = [
    ["fullName", "Full Name"],
    ["headline", "Headline"],
    ["email", "Email"],
    ["phone", "Phone"],
    ["location", "Location"],
    ["website", "Website"],
    ["linkedin", "LinkedIn"],
    ["github", "GitHub"],
  ];
  for (const [key, label] of personalFields) {
    const value = pi[key];
    if (value) {
      fields.push({ field: `personalInfo.${key}`, currentValue: value, label });
    }
  }

  if (data.summary) {
    fields.push({ field: "summary", currentValue: data.summary, label: "Summary" });
  }

  data.sections.forEach((section, sectionIndex) => {
    if (section.title) {
      fields.push({
        field: `sections[${sectionIndex}].title`,
        currentValue: section.title,
        label: `Section Title (“${section.title}”)`,
      });
    }

    section.entries.forEach((entry, entryIndex) => {
      const entryPrefix = `sections[${sectionIndex}].entries[${entryIndex}]`;
      const entryLabel = entry.title || section.title || "entry";

      // Every scalar string field on an entry is inline-editable — no
      // hardcoded field list. `id`, `bullets`, and `tags` are excluded
      // (bullets/tags are list fields handled below; id is internal).
      const SKIP_KEYS = new Set(["id", "bullets", "tags"]);
      let endDateAdded = false;
      for (const key of Object.keys(entry) as Array<keyof ResumeEntry>) {
        if (SKIP_KEYS.has(key)) continue;
        const value = entry[key];
        if (typeof value !== "string" || !value) continue;
        if (key === "endDate") endDateAdded = true;
        fields.push({
          field: `${entryPrefix}.${key}`,
          currentValue: value,
          label: `${labelForKey(key)} (“${entryLabel}”)`,
        });
      }

      // When an entry is current (isCurrent), the template prints "Present"
      // for the end date even if endDate isn't explicitly stored. Register
      // it so clicking the printed "Present" opens the inline editor with
      // "Present" as the editable value.
      if (entry.isCurrent && !endDateAdded) {
        fields.push({
          field: `${entryPrefix}.endDate`,
          currentValue: "Present",
          label: `End Date (“${entryLabel}”)`,
        });
      }

      entry.bullets?.forEach((bullet, bulletIndex) => {
        if (bullet) {
          fields.push({
            field: `${entryPrefix}.bullets[${bulletIndex}]`,
            currentValue: bullet,
            label: `Bullet (“${entryLabel}”)`,
          });
        }
      });

      entry.tags?.forEach((tag, tagIndex) => {
        if (tag) {
          fields.push({
            field: `${entryPrefix}.tags[${tagIndex}]`,
            currentValue: tag,
            label: `Tag (“${entryLabel}”)`,
          });
        }
      });
    });
  });

  return fields;
}

/** A run is phone-like when it carries at least this many digits — below
 *  that, digits (years, street numbers) are too generic to match on. */
const PHONE_MIN_DIGITS = 7;

/** Substring matching needs meaningful text on the short side — without
 *  this, a two-letter tag ("AI") hijacks clicks on longer text ("Email"
 *  contains "ai"). */
const MIN_TEXT_MATCH = 3;

function squash(text: string): string {
  return text.replace(/\s+/g, "").toLowerCase();
}

/** Turns a camelCase entry key into a human-readable label
 *  (e.g. "startDate" → "Start Date", "cgpa" → "CGPA"). */
function labelForKey(key: string): string {
  const ACROYNMS: Record<string, string> = {
    cgpa: "CGPA",
    gpa: "GPA",
    api: "API",
    url: "URL",
    pdf: "PDF",
    id: "ID",
  };
  if (ACROYNMS[key]) return ACROYNMS[key];
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * The template reformats phones for print (adds the +880 country code and
 * spacing), so the printed number never string-matches the stored value.
 * When the clicked text is phone-like, compare digit sequences instead.
 * Letter-spaced section titles print with spaces between glyphs
 * ("C O R E S K I L L S"), so equality also compares whitespace-collapsed
 * forms.
 */
function matches(clicked: string, value: string): boolean {
  if (clicked.toLowerCase() === value.toLowerCase()) return true;
  const clickedDigits = digitsOnly(clicked);
  if (clickedDigits.length >= PHONE_MIN_DIGITS) {
    return digitsOnly(value) === clickedDigits;
  }
  return squash(clicked) === squash(value);
}

function contains(clicked: string, value: string): boolean {
  if (value.toLowerCase().includes(clicked.toLowerCase())) return true;
  const clickedDigits = digitsOnly(clicked);
  if (clickedDigits.length < PHONE_MIN_DIGITS) return false;
  return digitsOnly(value).includes(clickedDigits);
}

/**
 * Searches ResumeData for a field matching the clicked text. Templates may
 * transform values before printing (e.g. an uppercase name), so all
 * comparisons are case-insensitive. Tries exact match first, then "clicked
 * text is a substring of the field value" — which is how a single line of a
 * wrapped bullet finds the whole bullet — then the reverse.
 */
export function findFieldByText(
  data: ResumeData,
  clickedText: string,
  /** Where inside the clicked run the cursor landed, 0 (left) to 1
   *  (right) — disambiguates multi-field runs like printed date ranges. */
  xHint?: number,
): EditableField | null {
  const fields = collectEditableFields(data);
  if (!fields.length) return null;

  // Letter-spaced print: section titles arrive as "L A N G UAG E S". When
  // the click looks letter-spaced and collapses onto a section title,
  // prefer that title — an entry elsewhere can hold the identical plain
  // text, but the spaced click was aimed at the heading.
  if (/[A-Za-z] [A-Za-z]/.test(clickedText)) {
    const squashedClick = squash(clickedText);
    const title = fields.find(
      (f) =>
        /sections\[\d+\]\.title$/.test(f.field) &&
        squash(f.currentValue) === squashedClick,
    );
    if (title) return title;
  }

  // Reverse-contains fallback: a clicked line can contain several fields
  // (contact rows, entry headers) — prefer the longest matching value, the
  // most specific one, rather than whichever happens to be declared first.
  // Short values are excluded: a two-letter tag must not hijack a longer
  // clicked text that merely contains it.
  let reverseMatch: EditableField | null = null;
  for (const field of fields) {
    if (field.currentValue.trim().length < MIN_TEXT_MATCH) continue;
    if (!contains(clickedText, field.currentValue)) continue;
    if (
      !reverseMatch ||
      field.currentValue.length > reverseMatch.currentValue.length
    ) {
      reverseMatch = field;
    }
  }

  return (
    fields.find((f) => matches(clickedText, f.currentValue)) ??
    reverseMatch ??
    tokenInLine(clickedText, fields, xHint) ??
    findFieldByDate(data, clickedText, fields, xHint)
  );
}

/** Token match for dot-separated / inline lines ("Node.js . Nest.js . Laravel
 *  . React.js"). Finds every field value that appears as a whole word in the
 *  clicked line, then uses `xHint` (click position 0–1 across the line) to pick
 *  the one closest to where the user clicked — so clicking on "Nest.js" edits
 *  "Nest.js", not "Node.js". */
function tokenInLine(
  clicked: string,
  fields: EditableField[],
  xHint?: number,
): EditableField | null {
  const matches = fields.filter(
    (f) =>
      f.currentValue.trim().length >= MIN_TEXT_MATCH &&
      new RegExp(
        `\\b${f.currentValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i",
      ).test(clicked),
  );

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  if (xHint !== undefined) {
    // Multiple values match as whole words — pick the one whose position in
    // the line is closest to the click position.
    return matches.reduce((best, current) => {
      const bestPos = textPosition(clicked, best.currentValue);
      const currentPos = textPosition(clicked, current.currentValue);
      return Math.abs(currentPos - xHint) < Math.abs(bestPos - xHint)
        ? current
        : best;
    });
  }

  return matches[0];
}

/** Relative position (0–1) of `value`'s first occurrence within `text`. */
function textPosition(text: string, value: string): number {
  const idx = text.toLowerCase().indexOf(value.toLowerCase());
  return idx === -1 ? -1 : idx / text.length;
}

/** Field paths ending in a date scalar. */
function isDateField(field: string): boolean {
  return field.endsWith(".startDate") || field.endsWith(".endDate");
}

/** Known parts must agree; unknown parts don't disqualify a match. */
function sameResumeDate(
  a: ResumeDateParts | null,
  b: ResumeDateParts | null,
): boolean {
  if (!a || !b) return false;
  return (
    a.year === b.year &&
    (a.month ?? -1) === (b.month ?? -1) &&
    (a.day ?? -1) === (b.day ?? -1)
  );
}

/**
 * Dates are stored canonically ("2025-08") but printed reformatted
 * ("Aug 2025 – Present"), so printed ranges never string-match storage.
 * Clicks fall back to parsing: a lone printed date matches whichever date
 * field holds the same moment; a printed range opens the START date of the
 * entry (the natural "edit this range" entry point) when its first half
 * matches, or the end date when only the second half does.
 */
function findFieldByDate(
  data: ResumeData,
  clickedText: string,
  fields: EditableField[],
  xHint?: number,
): EditableField | null {
  const dateFields = fields.filter((f) => isDateField(f.field));
  if (!dateFields.length) return null;

  // All date fields whose stored value parses to the same moment as the
  // segment — several entries can legitimately print the same date (one
  // role's end is the next role's start), so callers pick by role.
  const matchesFor = (segment: string): EditableField[] => {
    const parts = parseResumeDate(segment);
    if (!parts) return [];
    return dateFields.filter((f) =>
      sameResumeDate(parseResumeDate(f.currentValue), parts),
    );
  };

  // A lone printed date.
  const wholeMatches = matchesFor(clickedText);
  if (wholeMatches.length > 0) return wholeMatches[0];

  // A printed range "Aug 2024 – Aug 2025". Split on separators that carry
  // spaces on both sides, so a stored-style "2024-08" survives intact.
  const segments = clickedText
    .split(/\s+[–—-]\s+|\s+to\s+/i)
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length >= 2) {
    // Find all date fields matching either segment by parsed value.
    const startMatches = matchesFor(segments[0]);
    const endMatches = matchesFor(segments[segments.length - 1]);

    if (xHint !== undefined) {
      // Pick the field matching the segment under the click position.
      // xHint > 0.5 means the user clicked the right half (end date),
      // xHint < 0.5 means the left half (start date). Segment boundaries
      // are approximate — good enough for 2-segment date ranges.
      const preferEnd = xHint > 0.5;

      const preferStartMatches = startMatches.filter((f) =>
        f.field.endsWith(".startDate"),
      );
      const preferEndMatches = endMatches.filter((f) =>
        f.field.endsWith(".endDate"),
      );

      // If a segment doesn't parse as a date (e.g. "Present"), still offer
      // the corresponding date field so clicking on it edits that field.
      const startField =
        preferStartMatches[0] ??
        dateFields.find((f) => f.field.endsWith(".startDate"));
      const endField =
        preferEndMatches[0] ??
        dateFields.find((f) => f.field.endsWith(".endDate"));

      if (preferEnd && endField) {
        return endField;
      }
      if (!preferEnd && startField) {
        return startField;
      }
      return endField ?? startField ?? null;
    }

    // No xHint or no candidates — fall back to start date first.
    if (startMatches.length > 0) {
      return startMatches.find((m) => m.field.endsWith(".startDate")) ?? startMatches[0];
    }
    if (endMatches.length > 0) {
      return endMatches.find((m) => m.field.endsWith(".endDate")) ?? endMatches[0];
    }
  }

  return null;
}

export interface EditorStoreActions {
  setPersonalInfo: (patch: Partial<ResumeData["personalInfo"]>) => void;
  setSummary: (summary: string) => void;
  updateSection: (sectionId: string, patch: Partial<ResumeData["sections"][number]>) => void;
  updateEntry: (
    sectionId: string,
    entryId: string,
    patch: Partial<ResumeEntry>,
  ) => void;
}

/**
 * Builds an update function for a given field path that calls the
 * appropriate editor store action. The caller passes in the store's
 * actions; unknown paths produce a no-op rather than a wrong write.
 */
export function makeFieldUpdater(
  actions: EditorStoreActions,
  field: EditableField,
  data: ResumeData,
): (nextValue: string) => void {
  const segments = parseFieldPath(field.field);
  const [root, ...rest] = segments;

  if (!root || !("key" in root)) return () => {};

  if (root.key === "personalInfo") {
    const sub = rest[0];
    if (!sub || !("key" in sub)) return () => {};
    return (nextValue) => {
      actions.setPersonalInfo({ [sub.key]: nextValue });
    };
  }

  if (root.key === "summary") {
    return (nextValue) => {
      actions.setSummary(nextValue);
    };
  }

  if (root.key === "sections") {
    const sectionSegment = rest[0];
    const propertySegment = rest[1];
    if (
      !sectionSegment ||
      !("index" in sectionSegment) ||
      !propertySegment ||
      !("key" in propertySegment)
    ) {
      return () => {};
    }

    const section = data.sections[sectionSegment.index];
    if (!section) return () => {};

    // sections[i].title
    if (propertySegment.key === "title") {
      return (nextValue) => {
        actions.updateSection(section.id, { title: nextValue });
      };
    }

    // sections[i].entries[j].<field>
    if (propertySegment.key === "entries") {
      const entrySegment = rest[2];
      const entryProperty = rest[3];
      if (
        !entrySegment ||
        !("index" in entrySegment) ||
        !entryProperty ||
        !("key" in entryProperty)
      ) {
        return () => {};
      }

      const entry = section.entries[entrySegment.index];
      if (!entry) return () => {};

      // List-valued fields replace one element: bullets[k], tags[k].
      const listField = rest[4];
      if (
        (entryProperty.key === "bullets" || entryProperty.key === "tags") &&
        listField &&
        "index" in listField
      ) {
        const listKey: "bullets" | "tags" =
          entryProperty.key === "bullets" ? "bullets" : "tags";
        const listIndex = listField.index;
        return (nextValue) => {
          const list = [...entry[listKey]];
          if (listIndex >= list.length) return;
          list[listIndex] = nextValue;
          actions.updateEntry(section.id, entry.id, {
            [listKey]: list,
          });
        };
      }

      // Scalar entry fields.
      return (nextValue) => {
        actions.updateEntry(section.id, entry.id, {
          [entryProperty.key]: nextValue,
        });
      };
    }
  }

  return () => {};
}
