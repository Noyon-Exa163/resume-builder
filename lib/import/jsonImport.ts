import type { ResumeData } from "@/lib/schema/resume";
import type { DeepPartial } from "@/lib/schema/normalize";

export type ParsedResumeJson =
  | { ok: true; data: DeepPartial<ResumeData> }
  | { ok: false; error: string };

const NOT_A_RESUME_ERROR =
  "That JSON file doesn't look like an exported resume. Attach a .json file exported from this app.";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Reads the text of an attached `.json` file and checks it is a resume
 * exported from this app (see lib/export/toJson.ts) before anything is
 * applied. Deliberately lenient: every export carries `personalInfo`, so that
 * is required, while missing newer fields are filled in by normalization
 * later. Unrelated JSON, arrays and other schema versions are rejected with a
 * message a non-technical user can act on.
 */
export function parseResumeJson(text: string): ParsedResumeJson {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return {
      ok: false,
      error: "That file isn't valid JSON. Attach a .json file exported from this app.",
    };
  }

  if (!isPlainObject(value) || !isPlainObject(value.personalInfo)) {
    return { ok: false, error: NOT_A_RESUME_ERROR };
  }
  if ("sections" in value && !Array.isArray(value.sections)) {
    return { ok: false, error: NOT_A_RESUME_ERROR };
  }
  if ("schemaVersion" in value && value.schemaVersion !== 1) {
    return {
      ok: false,
      error:
        "That resume was exported from a different version of the app and can't be imported.",
    };
  }

  return { ok: true, data: value as DeepPartial<ResumeData> };
}
