/**
 * Locale date and time, e.g. "Sep 21, 2026, 7:30 PM". Undefined if unparseable.
 *
 * Lives in lib/date per the module's own rule (this is the only other place
 * that may format a date). The locale is intentionally left to the viewer's
 * browser — dates render exactly as they did before this file existed. Note
 * for future changes: server-rendered text using this util will differ from
 * a visitor's browser locale, so keep its consumers client-only or
 * interaction-time (portals, tooltips) — as every current call site is.
 */
export function formatDateTime(iso: string): string | undefined {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
