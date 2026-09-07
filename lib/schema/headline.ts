/**
 * Headlines under the name join specialties with a bullet, never a pipe.
 * Import, save, and print all go through this so stored `|` becomes ` • `.
 */
const HEADLINE_BAR = /\s*[|│｜]\s*/g;

export function normalizeHeadline(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return value.replace(HEADLINE_BAR, " • ").replace(/[ \t]{2,}/g, " ").trim();
}
