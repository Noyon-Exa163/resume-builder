import {
  layoutForSection,
  type ResumeData,
  type ResumeEntry,
  type ResumeSection,
  type SectionKind,
} from "@/lib/schema/resume";
import type { DeepPartial } from "@/lib/schema/normalize";

export type HeuristicSourceFormat = "pdf" | "docx" | "markdown" | "text";

interface ParsedLine {
  text: string;
  isHeading: boolean;
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const URL_RE = /((https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/[^\s]*)?)/i;
const BULLET_RE = /^[•\-*▪‣◦]\s+|^\d+[.)]\s+/;
const MONTH = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?";
const DATE_RANGE_RE = new RegExp(
  `(${MONTH}\\s+)?(\\d{4})\\s*(?:[-–—]|to)\\s*(${MONTH}\\s+)?(\\d{4}|Present|Current)`,
  "i",
);

/** Contact-info block at the top of most resumes — name/email/phone/links. */
const PERSONAL_INFO_WINDOW = 10;

/**
 * Anchored to the *whole* line (modulo a few common modifier words) rather
 * than a bare substring test — a content line like "Languages: JavaScript,
 * TypeScript, Python" inside a Skills section also contains the word
 * "Languages", and an unanchored pattern would misread it as a new heading.
 */
const SECTION_KEYWORDS: Array<{
  pattern: RegExp;
  kind: SectionKind;
}> = [
  {
    pattern: /^(work\s+|professional\s+|relevant\s+)?(experience|employment( history)?|work history)$/i,
    kind: "experience",
  },
  {
    pattern: /^(education|educational background|academic background|academics?)$/i,
    kind: "education",
  },
  {
    pattern: /^(technical\s+|core\s+|key\s+)?skills$/i,
    kind: "skills",
  },
  { pattern: /^(key\s+|personal\s+)?projects?$/i, kind: "projects" },
  {
    pattern: /^certifications?( (and|&) licenses)?$|^licenses?( (and|&) certifications?)?$/i,
    kind: "certifications",
  },
  { pattern: /^languages?$/i, kind: "languages" },
  {
    pattern: /^(awards( (and|&) honors)?|honors( (and|&) awards)?)$/i,
    kind: "awards",
  },
  { pattern: /^(references?|referees?)$/i, kind: "custom" },
];

/**
 * Best-effort, no-AI resume parser: keyword section headers, email/phone/date
 * regexes, bullet-marker splitting. Gets a reasonably-formatted resume most
 * of the way there — the caller's review/editor is where the rest gets
 * fixed by hand, exactly like AI parsing. Unmatched text always lands in a
 * `kind: "custom"` catch-all section rather than being dropped.
 */
export function parseResumeHeuristically(
  text: string,
  sourceFormat: HeuristicSourceFormat,
): DeepPartial<ResumeData> {
  const lines =
    sourceFormat === "docx" ? linesFromHtml(text) : linesFromPlainText(text);

  const personalInfo = extractPersonalInfo(lines);

  // A name styled as <h1>/bold/ALL-CAPS (common in PDF/DOCX output) reads as
  // a heading too, but it isn't a section — skip the specific line already
  // claimed as personalInfo.fullName rather than splitting a bogus section
  // off of it. Only ever suppresses the first such match, so a later real
  // section can't accidentally be skipped just for sharing that text.
  let suppressedFullNameHeading = false;
  const headingIndexes = lines.reduce<number[]>((acc, line, index) => {
    if (!line.isHeading) return acc;
    if (
      !suppressedFullNameHeading &&
      index < PERSONAL_INFO_WINDOW &&
      personalInfo.fullName &&
      line.text === personalInfo.fullName
    ) {
      suppressedFullNameHeading = true;
      return acc;
    }
    acc.push(index);
    return acc;
  }, []);

  const sections: DeepPartial<ResumeSection>[] = [];

  const preambleEnd = headingIndexes[0] ?? lines.length;
  const preambleLines = lines.slice(PERSONAL_INFO_WINDOW, preambleEnd);
  if (preambleLines.some((line) => line.text.trim())) {
    sections.push(buildSection("Other", "custom", preambleLines));
  }

  for (let i = 0; i < headingIndexes.length; i += 1) {
    const headingIndex = headingIndexes[i];
    const start = headingIndex + 1;
    const end = headingIndexes[i + 1] ?? lines.length;
    const heading = lines[headingIndex].text;
    const segmentLines = lines.slice(start, end);
    const kind = classifyHeading(heading) ?? ("custom" as SectionKind);
    sections.push(buildSection(heading, kind, segmentLines));
  }

  return { personalInfo, sections };
}

function buildSection(
  title: string,
  kind: SectionKind,
  lines: ParsedLine[],
): DeepPartial<ResumeSection> {
  const layout = layoutForSection(kind, title);
  return {
    kind,
    title,
    layout,
    entries: layout === "tags" ? parseTagEntries(lines) : parseListEntries(lines),
  };
}

function classifyHeading(heading: string): SectionKind | null {
  for (const entry of SECTION_KEYWORDS) {
    if (entry.pattern.test(heading)) return entry.kind;
  }
  return null;
}

function linesFromHtml(html: string): ParsedLine[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const headingTags = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);
  const lines: ParsedLine[] = [];

  for (const el of Array.from(doc.body.children)) {
    // mammoth renders bullet lists as <ul>/<ol><li>, with no literal bullet
    // character in the text — mark each item explicitly so BULLET_RE (which
    // downstream entry-parsing relies on) recognizes them as bullets.
    if (el.tagName === "UL" || el.tagName === "OL") {
      for (const item of Array.from(el.children)) {
        const itemText = (item.textContent ?? "").trim();
        if (itemText) lines.push({ text: `• ${itemText}`, isHeading: false });
      }
      continue;
    }

    const value = (el.textContent ?? "").trim();
    if (!value) continue;
    // <h1>-<h6> is a strong structural signal, trusted regardless of casing.
    // A bold/strong paragraph is weaker — a bold job title is common too —
    // so only count it as a heading if it's also ALL CAPS or matches a
    // known section keyword, same bar as plain-text heading detection.
    const isAllCaps = value === value.toUpperCase() && /[A-Z]/.test(value);
    const boldOrCaps = Boolean(el.querySelector("strong,b")) || isAllCaps;
    const isHeading =
      headingTags.has(el.tagName) ||
      (boldOrCaps &&
        value.length < 60 &&
        !/[.;]$/.test(value) &&
        (isAllCaps ||
          SECTION_KEYWORDS.some((entry) => entry.pattern.test(value))));
    lines.push({ text: value, isHeading });
  }

  return lines;
}

function linesFromPlainText(text: string): ParsedLine[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => ({ text: line, isHeading: isHeadingCandidate(line) }));
}

function isHeadingCandidate(line: string): boolean {
  if (line.length === 0 || line.length > 60) return false;
  if (/[.;]$/.test(line)) return false;
  if (BULLET_RE.test(line)) return false;
  // Plain text carries no font/weight signal, so headings are recognized
  // only by ALL-CAPS convention or a known section keyword (in any casing,
  // e.g. "Work Experience") — a generic Title Case check would also match
  // ordinary job titles/company names and over-fragment sections.
  const isAllCaps = line === line.toUpperCase() && /[A-Z]/.test(line);
  const matchesKeyword = SECTION_KEYWORDS.some((entry) => entry.pattern.test(line));
  return isAllCaps || matchesKeyword;
}

function extractPersonalInfo(
  lines: ParsedLine[],
): DeepPartial<ResumeData["personalInfo"]> {
  const info: DeepPartial<ResumeData["personalInfo"]> = {};
  const candidateLines = lines.slice(0, PERSONAL_INFO_WINDOW);

  for (const line of candidateLines) {
    const text = line.text;

    const emailMatch = text.match(EMAIL_RE);
    if (emailMatch) {
      if (!info.email) info.email = emailMatch[0];
      continue;
    }

    const urlMatch = text.match(URL_RE);
    if (urlMatch) {
      const url = urlMatch[0];
      if (/linkedin\.com/i.test(url)) {
        if (!info.linkedin) info.linkedin = url;
        continue;
      }
      if (/github\.com/i.test(url)) {
        if (!info.github) info.github = url;
        continue;
      }
      if (!info.website) info.website = normalizeUrl(url);
      continue;
    }

    const phoneMatch = text.match(PHONE_RE);
    if (phoneMatch && phoneMatch[0].replace(/\D/g, "").length >= 7) {
      if (!info.phone) info.phone = phoneMatch[0].trim();
      continue;
    }

    // Skip lines that are recognized *section* headings (e.g. an early
    // "Experience") — but a name styled as <h1>/bold/ALL-CAPS is still fair
    // game for fullName, since that's a common way resumes render the name.
    if (!info.fullName && !classifyHeading(text)) {
      info.fullName = text;
    }
  }

  return info;
}

function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

interface DraftEntry {
  title?: string;
  subtitle?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  bullets: string[];
}

function parseListEntries(lines: ParsedLine[]): DeepPartial<ResumeEntry>[] {
  const entries: DraftEntry[] = [];
  let current: DraftEntry | null = null;

  const pushCurrent = () => {
    if (
      current &&
      (current.title || current.subtitle || current.bullets.length > 0)
    ) {
      entries.push(current);
    }
    current = null;
  };

  for (const line of lines) {
    const text = line.text;
    if (!text) continue;

    if (BULLET_RE.test(text)) {
      if (!current) current = { bullets: [] };
      current.bullets.push(text.replace(BULLET_RE, "").trim());
      continue;
    }

    const dateMatch = text.match(DATE_RANGE_RE);
    if (dateMatch) {
      const parsedDate = parseDateMatch(dateMatch);
      if (current && !current.startDate && current.bullets.length === 0) {
        Object.assign(current, parsedDate);
      } else {
        pushCurrent();
        current = { bullets: [], ...parsedDate };
      }
      const leftover = text.replace(dateMatch[0], "").trim();
      if (leftover && current && !current.subtitle) current.subtitle = leftover;
      continue;
    }

    if (!current || (current.title && current.subtitle && current.bullets.length > 0)) {
      pushCurrent();
      current = { bullets: [], title: text };
    } else if (!current.title) {
      current.title = text;
    } else if (!current.subtitle) {
      current.subtitle = text;
    } else {
      current.description = current.description
        ? `${current.description} ${text}`
        : text;
    }
  }
  pushCurrent();

  return entries;
}

function parseDateMatch(
  match: RegExpMatchArray,
): Pick<DraftEntry, "startDate" | "endDate" | "isCurrent"> {
  const [, startMonth, startYear, endMonth, endYearOrWord] = match;
  const startDate = [startMonth?.trim(), startYear].filter(Boolean).join(" ");
  const isCurrent = /present|current/i.test(endYearOrWord);
  const endDate = isCurrent
    ? undefined
    : [endMonth?.trim(), endYearOrWord].filter(Boolean).join(" ");
  return { startDate, endDate, isCurrent: isCurrent || undefined };
}

function parseTagEntries(lines: ParsedLine[]): DeepPartial<ResumeEntry>[] {
  const entries: DeepPartial<ResumeEntry>[] = [];

  for (const line of lines) {
    const text = line.text.replace(BULLET_RE, "").trim();
    if (!text) continue;

    const colonIndex = text.indexOf(":");
    if (colonIndex > 0 && colonIndex < 40) {
      entries.push({
        title: text.slice(0, colonIndex).trim(),
        tags: splitTags(text.slice(colonIndex + 1)),
      });
    } else {
      entries.push({ title: "", tags: splitTags(text) });
    }
  }

  return entries;
}

function splitTags(text: string): string[] {
  return text
    .split(/[,•|;]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}
