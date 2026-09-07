/**
 * Headlines under the name join specialties with a bullet, never a pipe.
 * Import, save, and print all go through this so stored `|` becomes ` • `.
 */
const HEADLINE_BAR = /\s*[|│｜]\s*/g;

/**
 * Swap `|` for a bullet as the user types. Does not trim — a trailing
 * space has to survive so the next word can be typed.
 */
export function replaceHeadlineBars(value: string): string {
  return value.replace(HEADLINE_BAR, " • ");
}

export function normalizeHeadline(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return replaceHeadlineBars(value).replace(/[ \t]{2,}/g, " ").trim();
}
