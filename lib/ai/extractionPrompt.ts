import type { AIExtractResumeInput } from "./types";

/**
 * Prose/JSON-shape description of `ResumeData` (`lib/schema/resume.ts`).
 * Models see this; callers still validate with ResumeDataSchema one layer up.
 */
export const RESUME_SCHEMA_DESCRIPTION = `{
  schemaVersion: 1,
  meta: {
    title: string,                  // resume document title, not the person's name
    pageSize: "A4" | "Letter"     // default A4
  },
  personalInfo: {
    fullName: string,
    headline?: string,              // join titles with " • ", never "|"
    email?: string,                 // valid email or omit / ""
    phone?: string,
    location?: string,
    website?: string,               // absolute URL or omit / ""
    linkedin?: string,
    github?: string
    // photoDataUrl is not extracted from text — omit it
  },
  summary?: string,
  sections: [
    {
      kind: "experience" | "education" | "skills" | "projects"
          | "certifications" | "languages" | "awards" | "custom",
      title: string,                // section heading as it should appear
      visible: true,
      entries: [
        {
          title: string,            // job title, degree, project name, skill group, …
          subtitle?: string,        // company, school, issuer
          location?: string,
          startDate?: string,       // YYYY-MM-DD, YYYY-MM, or YYYY — never guess
          endDate?: string,         //   a precision the source doesn't state
          isCurrent?: boolean,
          bullets?: string[],
          tags?: string[],          // skill keywords, tech stack
          description?: string,
          link?: string             // absolute URL or omit / ""
        }
      ]
    }
  ]
}`;

/**
 * Shared extraction prompt + schema description so every provider asks for
 * the same thing and differs only in HTTP transport.
 */
export function buildExtractionPrompt(
  rawText: string,
  customInstruction?: string,
): { prompt: string; schemaDescription: string } {
  return {
    schemaDescription: RESUME_SCHEMA_DESCRIPTION,
    prompt: formatExtractionPrompt({
      rawText,
      customInstruction,
      schemaDescription: RESUME_SCHEMA_DESCRIPTION,
    }),
  };
}

/**
 * Compose the user-facing extraction prompt from an `AIExtractResumeInput`.
 * Adapters should call this rather than rebuilding the instructions per vendor
 * so a retry can swap `schemaDescription` without forking prompt text.
 */
export function formatExtractionPrompt(input: AIExtractResumeInput): string {
  const parts = [
    "Extract a structured resume from the source text and return a JSON object matching the shape below.",
    "If you find any typos or formatting errors in the source text, correct them before extracting the resume. But beware of technical terms and abbreviations that might look like typos.",
    "Omit fields you cannot support from the source. Do not invent employers, dates, degrees, or skills.",
    "Omit ids, createdAt, updatedAt, and photoDataUrl — those are assigned later.",
    "schemaVersion must be 1 when present.",
    "If you cannot find a resume title in the source text, create one based on the person's past job titles and specialties.",
    'If personalInfo.headline lists multiple titles or specialties separated by "|" (or a similar bar), join them with a spaced bullet " • " instead. Example: "DevOps Engineer • Cloud Infrastructure".',
    "",
    "JSON shape:",
    input.schemaDescription,
  ];

  if (input.customInstruction?.trim()) {
    parts.push(
      "",
      "Additional instructions from the user:",
      input.customInstruction.trim(),
    );
  }

  parts.push("", "Source resume text:", input.rawText);
  return parts.join("\n");
}
