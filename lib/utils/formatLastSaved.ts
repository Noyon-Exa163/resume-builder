import { formatDistance, isValid, parseISO } from "date-fns";
import { formatDisplayDate } from "@/lib/date";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Relative "just now" / "5 minutes ago" label; falls back to a calendar
 *  date after a day. Returns null for an unparseable timestamp so callers
 *  can supply their own fallback text. */
function formatRelativeLabel(iso: string, now: Date): string | null {
  const date = parseISO(iso);
  if (!isValid(date)) return null;

  const elapsed = now.getTime() - date.getTime();
  if (elapsed < MINUTE_MS) return "just now";
  if (elapsed < DAY_MS) return formatDistance(date, now, { addSuffix: true });
  return formatDisplayDate(iso);
}

/** Relative "Saved …" label; falls back to a calendar date after a day. */
export function formatLastSavedLabel(iso: string, now = new Date()): string {
  const label = formatRelativeLabel(iso, now);
  return label ? `Saved ${label}` : "Saved";
}

/** Relative timestamp label for a chat message, e.g. "2 minutes ago". */
export function formatChatTimestampLabel(iso: string, now = new Date()): string {
  return formatRelativeLabel(iso, now) ?? "";
}
