/**
 * The one place in the app that reads, writes, or formats a date.
 *
 * Resume dates are partial by nature: a job might be recorded as "2016", as
 * "Sep 2020", or as a full calendar date. Rather than force a precision the
 * user doesn't have, every date is parsed into the parts that are actually
 * known and rendered at that precision.
 *
 * Three formats, and only three:
 *   - Stored   YYYY | YYYY-MM | YYYY-MM-DD  — sortable and unambiguous
 *   - Shown    DD MMM YYYY | MMM YYYY | YYYY
 *   - Typed    DD/MM/YYYY, with the separators inserted as the user types
 *
 * Nothing outside this module should format or parse a date. Reach for
 * `formatDisplayDate` / `formatDateRange` to show one and `DateInput` to
 * collect one.
 */

/** A date at whatever precision is actually known. */
export interface ResumeDateParts {
  year: number;
  /** 1-12, when the month is known. */
  month?: number;
  /** 1-31. Only ever set alongside `month`. */
  day?: number;
}

/** Range ends, matching the shape of a resume entry. */
export interface DateRangeParts {
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const RANGE_SEPARATOR = " – ";
const ONGOING_LABEL = "Present";
const MAX_INPUT_DIGITS = 8;

/** YYYY, YYYY-MM, YYYY-MM-DD, and full ISO timestamps. The timestamp tail
 *  must be a real time-of-day — a loose "space then anything" tail also
 *  swallowed printed date ranges ("2018 - 2022"), which then parsed as
 *  their first year and broke range-click resolution. */
const ISO_PATTERN =
  /^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
/** DD/MM/YYYY and MM/YYYY. Dots and dashes are accepted as separators too. */
const SLASH_PATTERN = /^(?:(\d{1,2})[/.-])?(\d{1,2})[/.-](\d{4})$/;
/** "Sep 2020", "September 2020", "07 Sep 2026" — what imports tend to produce. */
const NAMED_MONTH_PATTERN = /^(?:(\d{1,2})\s+)?([A-Za-z]{3,9})\.?\s+(\d{4})$/;

/**
 * Reads any date the app might hold — stored, imported, or hand-typed — into
 * its known parts. Returns null when the text isn't a date, which callers
 * treat as "pass it through untouched" rather than as an error.
 */
export function parseResumeDate(
  value: string | null | undefined,
): ResumeDateParts | null {
  const text = value?.trim() ?? "";
  if (text === "") return null;

  const iso = ISO_PATTERN.exec(text);
  if (iso) return buildParts(Number(iso[1]), iso[2], iso[3]);

  const slashed = SLASH_PATTERN.exec(text);
  if (slashed) return buildParts(Number(slashed[3]), slashed[2], slashed[1]);

  const named = NAMED_MONTH_PATTERN.exec(text);
  if (named) {
    const month = monthFromName(named[2]);
    if (month !== null) return buildParts(Number(named[3]), month, named[1]);
  }

  return null;
}

/**
 * The display format: DD MMM YYYY, dropping the parts that aren't known.
 * Text that isn't recognisable as a date is returned as-is so an imported or
 * unusual value is never silently swallowed.
 */
export function formatDisplayDate(value: string | null | undefined): string {
  const parts = parseResumeDate(value);
  if (!parts) return value?.trim() ?? "";

  const year = String(parts.year).padStart(4, "0");
  if (parts.month === undefined) return year;

  const month = MONTH_LABELS[parts.month - 1];
  if (parts.day === undefined) return `${month} ${year}`;

  return `${pad2(parts.day)} ${month} ${year}`;
}

/**
 * A start-to-end range as shown on a resume, e.g. "Sep 2020 – Present".
 * Used by the templates, the exporters, and the editor's entry summary so all
 * three read identically.
 */
export function formatDateRange({
  startDate,
  endDate,
  isCurrent,
}: DateRangeParts): string {
  const start = formatDisplayDate(startDate);
  const end = isCurrent ? ONGOING_LABEL : formatDisplayDate(endDate);

  if (start && end) return `${start}${RANGE_SEPARATOR}${end}`;
  return start || end;
}

/** The canonical stored form for a parsed date. */
export function toStorageDate(parts: ResumeDateParts): string {
  const year = String(parts.year).padStart(4, "0");
  if (parts.month === undefined) return year;
  if (parts.day === undefined) return `${year}-${pad2(parts.month)}`;
  return `${year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

/** The DD/MM/YYYY text for a stored value, for editing in a `DateInput`. */
export function toMaskedInput(value: string | null | undefined): string {
  const parts = parseResumeDate(value);
  if (!parts) return value?.trim() ?? "";

  const year = String(parts.year).padStart(4, "0");
  if (parts.month === undefined) return year;
  if (parts.day === undefined) return `${pad2(parts.month)}/${year}`;
  return `${pad2(parts.day)}/${pad2(parts.month)}/${year}`;
}

/**
 * Lays out a run of digits as DD/MM/YYYY, inserting each slash the moment the
 * segment before it fills — the same feel as a card-expiry field.
 *
 * The one wrinkle is that a resume date may be just a year or just a month and
 * year, and "2016" must not collapse into "20/16". A run of digits that could
 * still become a 19xx or 20xx year is therefore left whole, which also lets
 * "092026" land on "09/2026" instead of "09/20/26".
 */
export function maskDateDigits(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, MAX_INPUT_DIGITS);
  if (digits === "") return "";
  if (isYearRun(digits)) return digits;

  const day = digits.slice(0, 2);
  const afterDay = digits.slice(2);
  if (afterDay === "") return digits.length < 2 ? digits : `${day}/`;
  if (isYearRun(afterDay)) return `${day}/${afterDay}`;

  const month = afterDay.slice(0, 2);
  const year = afterDay.slice(2);
  if (year !== "") return `${day}/${month}/${year}`;
  return month.length < 2 ? `${day}/${month}` : `${day}/${month}/`;
}

/**
 * What to store for a masked value: the canonical form once there's enough to
 * understand, otherwise the text exactly as typed. Keeping the raw text means
 * a half-entered date survives the autosave that fires mid-edit.
 */
export function commitDateInput(masked: string): string {
  const parts = parseResumeDate(masked);
  return parts ? toStorageDate(parts) : masked;
}

/** True while these digits could still be completed into a 19xx/20xx year. */
function isYearRun(digits: string): boolean {
  if (digits.length > 4) return false;
  if (digits.length === 1) return digits === "1" || digits === "2";
  return digits.startsWith("19") || digits.startsWith("20");
}

function buildParts(
  year: number,
  month?: string | number,
  day?: string | number,
): ResumeDateParts | null {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) return null;

  const monthValue = toOptionalNumber(month);
  if (monthValue === undefined) return { year };
  if (monthValue < 1 || monthValue > 12) return null;

  const dayValue = toOptionalNumber(day);
  if (dayValue === undefined) return { year, month: monthValue };
  if (dayValue < 1 || dayValue > daysInMonth(year, monthValue)) return null;

  return { year, month: monthValue, day: dayValue };
}

function toOptionalNumber(value: string | number | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function monthFromName(name: string): number | null {
  const prefix = name.slice(0, 3).toLowerCase();
  const index = MONTH_LABELS.findIndex(
    (label) => label.toLowerCase() === prefix,
  );
  return index === -1 ? null : index + 1;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}
