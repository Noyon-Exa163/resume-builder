/**
 * Canonicalizes a Bangladeshi mobile number to "+880 XXXX XXX XXX" — the
 * fixed pattern every surface in the app (preview, exports, imports) must
 * agree on. Recognizes the number regardless of how it was typed (with/
 * without "+880", with a leading local "0", with dashes/dots/spaces/
 * parens). Anything that doesn't resolve to a 10-digit BD mobile national
 * number (leading "1", per the local 01XXXXXXXXX format) is returned
 * unchanged — this must never mangle a non-Bangladeshi number.
 */
export function formatBangladeshiPhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  let national: string | null = null;

  if (digits.startsWith("880") && digits.length === 13) {
    national = digits.slice(3);
  } else if (digits.startsWith("0") && digits.length === 11) {
    national = digits.slice(1);
  } else if (digits.length === 10) {
    national = digits;
  }

  if (!national || national[0] !== "1") return trimmed;

  return `+880 ${national.slice(0, 4)} ${national.slice(4, 7)} ${national.slice(7, 10)}`;
}
