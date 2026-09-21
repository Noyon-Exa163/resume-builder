/** Locale date and time, e.g. "Sep 21, 2026, 7:30 PM". Undefined if unparseable. */
export function formatDateTime(iso: string): string | undefined {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
