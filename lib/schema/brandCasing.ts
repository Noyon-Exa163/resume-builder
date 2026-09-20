/**
 * Brand names whose casing is fixed no matter what the author typed, what the
 * AI returned, or what a casing transform (ALL CAPS headings, Title Case
 * names) would produce. Add new brands here only.
 */
const BRANDS = ["bKash"] as const;

// Skips hosts, handles, and paths (bkash.com, @bkash, /bkash) so links and
// emails keep their real spelling.
const BRAND_PATTERNS = BRANDS.map((brand) => ({
  brand,
  pattern: new RegExp(
    `(?<![\\w@./-])${brand}(?![\\w@-]|\\.[a-z])`,
    "gi",
  ),
}));

export function fixBrandCasing(text: string): string {
  return BRAND_PATTERNS.reduce(
    (result, { brand, pattern }) => result.replace(pattern, brand),
    text,
  );
}

/** Uppercases for a heading while leaving brand names in their fixed casing. */
export function uppercaseKeepingBrands(text: string): string {
  return fixBrandCasing(text.toUpperCase());
}

const SKIPPED_KEYS = new Set(["photoDataUrl"]);

/** Returns a copy of `value` with every string run through `fixBrandCasing`. */
export function fixBrandCasingDeep<T>(value: T): T {
  if (typeof value === "string") return fixBrandCasing(value) as T;
  if (Array.isArray(value)) return value.map(fixBrandCasingDeep) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SKIPPED_KEYS.has(key) ? item : fixBrandCasingDeep(item),
      ]),
    ) as T;
  }
  return value;
}
