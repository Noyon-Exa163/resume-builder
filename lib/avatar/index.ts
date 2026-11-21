import {
  idle,
  happy,
  sad,
  mad,
  surprised,
  wink,
  sleepy,
  smug,
  unsure,
  scared,
  love,
  shy,
  sick,
  type Expression,
} from "blobatar/expression";

/**
 * Expressions a user can pick. `thinking` is left out on purpose: it is a
 * loading state that keeps moving, not a mood.
 */
export const AVATAR_EXPRESSIONS = {
  idle,
  happy,
  sad,
  mad,
  surprised,
  wink,
  sleepy,
  smug,
  unsure,
  scared,
  love,
  shy,
  sick,
} satisfies Record<string, Expression>;

export type AvatarExpressionKey = keyof typeof AVATAR_EXPRESSIONS;

export const AVATAR_EXPRESSION_KEYS = Object.keys(
  AVATAR_EXPRESSIONS,
) as AvatarExpressionKey[];

/** A user's saved avatar choices; null means "derive from the email". */
export interface AvatarPreferences {
  hue: number | null;
  expression: AvatarExpressionKey | null;
  /**
   * Uploaded profile photo as a data URL (Account page picker). Overrides
   * the generated avatar everywhere; null/absent falls back to
   * hue + expression.
   */
  photoDataUrl?: string | null;
}

export function isAvatarExpressionKey(
  value: unknown,
): value is AvatarExpressionKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(AVATAR_EXPRESSIONS, value);
}

/**
 * Color presets. `hue` doubles as the stored id (an OKLCH hue in degrees, so
 * an unknown value still renders sensibly). `cssVar` is the semantic token
 * that paints the swatch; `head` is that same token's value, mirrored here
 * because blobatar bakes hex into the SVG and cannot read CSS variables.
 * Keep `head` in sync with styles/tokens.css.
 */
export const AVATAR_COLORS = [
  { label: "Blue", hue: 257, cssVar: "--color-brand", head: "#0072ed" },
  { label: "Cyan", hue: 218, cssVar: "--chart-cyan", head: "#00b8db" },
  { label: "Mint", hue: 182, cssVar: "--chart-mint", head: "#00bba7" },
  { label: "Green", hue: 148, cssVar: "--chart-green", head: "#00c950" },
  { label: "Yellow", hue: 85, cssVar: "--chart-yellow", head: "#f6ba00" },
  { label: "Orange", hue: 44, cssVar: "--chart-orange", head: "#ff6900" },
  { label: "Red", hue: 25, cssVar: "--color-danger", head: "#fb2c36" },
  { label: "Pink", hue: 358, cssVar: "--chart-pink", head: "#ff509d" },
  { label: "Purple", hue: 305, cssVar: "--chart-purple", head: "#ad46ff" },
] as const;

/**
 * Swatch position used whenever a color is chosen. Keeps the eyes (which
 * blobatar derives from hue and tone) dark and readable on the chosen body.
 */
export const AVATAR_TONE = 0.7;

/** The exact body color for a preset hue; undefined for any other hue. */
export function getAvatarBodyColor(hue: number) {
  return AVATAR_COLORS.find((color) => color.hue === hue)?.head;
}

/**
 * Max stored photo size. The client downscales uploads to a 256px JPEG
 * (typically 10–30 KB); this only guards against oversized or garbage
 * strings reaching the database and API payloads.
 */
const AVATAR_PHOTO_MAX_LENGTH = 200_000;

/** True for a data-URL image string within the stored-size cap. */
export function isAvatarPhotoDataUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("data:image/") &&
    value.length <= AVATAR_PHOTO_MAX_LENGTH
  );
}

/** Builds preferences from the nullable `users.avatar_*` columns. */
export function avatarFromColumns(
  hue: number | null,
  expression: string | null,
  photoDataUrl: string | null = null,
): AvatarPreferences {
  return {
    hue: isAvatarHue(hue) ? hue : null,
    expression: isAvatarExpressionKey(expression) ? expression : null,
    photoDataUrl: isAvatarPhotoDataUrl(photoDataUrl) ? photoDataUrl : null,
  };
}

export function isAvatarHue(value: unknown): value is number {
  return AVATAR_COLORS.some((color) => color.hue === value);
}
