import type { ResumeEntry } from "./resume";

/** A trailing piece like "Inc." or "Ltd" belongs to the company name before
 *  it, so a comma in front of it is not the designation/company divider. */
const COMPANY_SUFFIX = /^(inc|ltd|llc|llp|plc|co|corp|limited|company)\.?$/i;

/**
 * The text a template or export shows for an entry's subtitle: the subtitle
 * and the organization, comma-joined, so nothing is lost wherever the two are
 * not laid out on separate lines.
 */
export function entrySubtitle(
  entry: Pick<ResumeEntry, "subtitle" | "organization">,
): string {
  return [entry.subtitle, entry.organization]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

/**
 * A referee's designation and company as separate values. Entries saved with
 * a combined subtitle ("Deputy Governor, Bangladesh Bank") and no
 * organization are split at the last comma — the company is the last part in
 * practice. An entry that already has an organization is used as is.
 */
export function splitDesignationAndCompany(
  entry: Pick<ResumeEntry, "subtitle" | "organization">,
): { designation: string; company: string } {
  const subtitle = entry.subtitle?.trim() ?? "";
  const organization = entry.organization?.trim() ?? "";
  if (organization) return { designation: subtitle, company: organization };

  const cut = subtitle.lastIndexOf(",");
  if (cut > 0) {
    const designation = subtitle.slice(0, cut).trim();
    const company = subtitle.slice(cut + 1).trim();
    if (designation && company && !COMPANY_SUFFIX.test(company)) {
      return { designation, company };
    }
  }
  return { designation: subtitle, company: "" };
}
