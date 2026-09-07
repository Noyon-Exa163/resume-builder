import { formatDistance, isValid, parseISO } from "date-fns";
import { formatDisplayDate } from "@/lib/date";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Relative "Saved …" label; falls back to a calendar date after a day. */
export function formatLastSavedLabel(iso: string, now = new Date()): string {
  const date = parseISO(iso);
  if (!isValid(date)) return "Saved";

  const elapsed = now.getTime() - date.getTime();
  if (elapsed < MINUTE_MS) return "Saved just now";
  if (elapsed < DAY_MS) {
    return `Saved ${formatDistance(date, now, { addSuffix: true })}`;
  }
  return `Saved ${formatDisplayDate(iso)}`;
}
