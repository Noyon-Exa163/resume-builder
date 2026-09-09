import { formatBangladeshiPhone } from "./formatPhone";

/**
 * Company contact that every Exabyting resume prints, regardless of what
 * the author typed. Kept out of stored personalInfo so it can't be deleted
 * from a draft and so imports don't overwrite it.
 */
export const SYSTEM_ALTERNATE_PHONE = "+8801676095674";

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Personal phone first (when present), then the system alternate — unless
 * the author already entered that same number.
 */
export function phonesForDisplay(personalPhone?: string): string[] {
  const phones = splitPersonalPhones(personalPhone);

  const alternateDigits = digitsOnly(SYSTEM_ALTERNATE_PHONE);
  if (!phones.some((phone) => digitsOnly(phone) === alternateDigits)) {
    phones.push(SYSTEM_ALTERNATE_PHONE);
  }
  return phones.map(formatBangladeshiPhone);
}

function splitPersonalPhones(personalPhone?: string): string[] {
  const trimmed = personalPhone?.trim() ?? "";
  if (!trimmed) return [];
  return trimmed
    .split(/\s*[|│｜/•]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function isSystemAlternatePhone(phone: string): boolean {
  return digitsOnly(phone) === digitsOnly(SYSTEM_ALTERNATE_PHONE);
}
