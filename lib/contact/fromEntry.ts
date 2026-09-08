/**
 * Pulls email / phone / URL out of a resume entry so templates can render
 * them as contact rows (used for references). Remaining prose is returned
 * so the same values are not printed twice. Labels such as "Email:", "P:",
 * "M:" are stripped from leftovers — the icon already names the field.
 */

export type EntryContactKind = "email" | "phone" | "link";

export interface EntryContactItem {
  kind: EntryContactKind;
  value: string;
}

export interface ExtractedEntryContact {
  items: EntryContactItem[];
  description?: string;
  bullets: string[];
  link?: string;
  location?: string;
  subtitle?: string;
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/g;
const URL_RE =
  /(?:https?:\/\/|www\.)[^\s]+|(?:[a-z]{2,3}\.)?(?:linkedin|github)\.com\/[^\s]+/gi;
/** Full words. Colon optional so "Email ada@" is cleaned too. */
const WORD_LABEL_RE =
  /\b(?:e-?mails?|phones?|telephones?|tels?|mobiles?|cells?|linkedin|github|websites?|ph)\b\s*[:.\-]?\s*/gi;
/** Single-letter labels only with a colon so "M Rahman" is kept. */
const SHORT_LABEL_RE = /\b[epmt]\s*:\s*/gi;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function isLikelyPhone(value: string): boolean {
  const digits = digitsOnly(value);
  return digits.length >= 10 && digits.length <= 15;
}

function collectMatches(text: string, pattern: RegExp): string[] {
  return [...text.matchAll(new RegExp(pattern.source, pattern.flags))].map(
    (match) => match[0],
  );
}

function uniquePush(
  items: EntryContactItem[],
  seen: Set<string>,
  item: EntryContactItem,
) {
  const key =
    item.kind === "phone"
      ? `phone:${digitsOnly(item.value)}`
      : `${item.kind}:${item.value.trim().toLowerCase()}`;
  if (seen.has(key)) return;
  seen.add(key);
  items.push({ ...item, value: item.value.trim() });
}

function harvest(text: string, items: EntryContactItem[], seen: Set<string>) {
  if (!text.trim()) return;
  for (const email of collectMatches(text, EMAIL_RE)) {
    uniquePush(items, seen, { kind: "email", value: email });
  }
  for (const phone of collectMatches(text, PHONE_RE)) {
    if (isLikelyPhone(phone)) {
      uniquePush(items, seen, { kind: "phone", value: phone.trim() });
    }
  }
  for (const url of collectMatches(text, URL_RE)) {
    const cleaned = url.replace(/[),.;]+$/, "");
    if (cleaned.includes("@")) continue;
    uniquePush(items, seen, { kind: "link", value: cleaned });
  }
}

function stripHarvested(text: string, harvested: string[]): string {
  let next = text;
  const sorted = [...harvested].sort((a, b) => b.length - a.length);
  for (const value of sorted) {
    next = next.split(value).join(" ");
  }
  next = next
    .replace(WORD_LABEL_RE, " ")
    .replace(SHORT_LABEL_RE, " ")
    .replace(/[|│•]+/g, " ")
    .replace(/[,\s/;:-]+$/g, "")
    .replace(/^[,\s/;:-]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!next || /^[\s,;:./|•\-]+$/.test(next)) return "";
  return next;
}

function harvestedValues(items: EntryContactItem[]): string[] {
  return items.map((item) => item.value);
}

/**
 * Extracts contact values from description, bullets, subtitle, link, and
 * location. Order is email, then phone, then link — stacked that way in
 * the template.
 */
export function extractEntryContact(entry: {
  description?: string;
  bullets?: string[];
  subtitle?: string;
  link?: string;
  location?: string;
}): ExtractedEntryContact {
  const items: EntryContactItem[] = [];
  const seen = new Set<string>();

  harvest(entry.description ?? "", items, seen);
  for (const bullet of entry.bullets ?? []) harvest(bullet, items, seen);
  harvest(entry.subtitle ?? "", items, seen);
  harvest(entry.link ?? "", items, seen);
  harvest(entry.location ?? "", items, seen);

  const values = harvestedValues(items);
  const description = stripHarvested(entry.description ?? "", values);
  const bullets = (entry.bullets ?? [])
    .map((bullet) => stripHarvested(bullet, values))
    .filter(Boolean);
  const subtitle = stripHarvested(entry.subtitle ?? "", values);
  const link = stripHarvested(entry.link ?? "", values);
  const location = stripHarvested(entry.location ?? "", values);

  return {
    items,
    description: description || undefined,
    bullets,
    subtitle: subtitle || undefined,
    link: link || undefined,
    location: location || undefined,
  };
}
