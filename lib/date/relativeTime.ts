import { formatDisplayDate } from "./resumeDate";

/**
 * A compact relative age for activity stamps, e.g. "Just now", "5m ago",
 * "3h ago", "2d ago". Past a month it falls back to the standard display
 * date — "23d ago" is still scannable, "78d ago" is not. Returns "" for
 * values that don't parse so callers can hide the stamp entirely.
 */
export function formatRelativeTime(
  value: string | null | undefined,
  now: number = Date.now(),
): string {
  const time = Date.parse(value ?? "");
  if (Number.isNaN(time)) return "";

  const elapsedMinutes = Math.floor((now - time) / 60_000);

  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 30) return `${elapsedDays}d ago`;

  return formatDisplayDate(value);
}
