/**
 * JSON Schema (draft-ish object) of the resume extraction payload.
 * Used as Anthropic tool `input_schema` (standard JSON Schema, lowercase types).
 *
 * Kept deliberately loose (`additionalProperties: true`, almost nothing
 * required) so the model can omit fields; `normalizeAndValidate()` fills
 * ids/defaults later. Not a 1:1 dump of the Zod schema — email/url unions
 * are expressed as strings here because tool schemas cannot easily encode
 * "valid URL or empty string".
 */
export const anthropicResumeInputSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    schemaVersion: { type: "integer" },
    meta: {
      type: "object",
      additionalProperties: true,
      properties: {
        title: { type: "string" },
        pageSize: { type: "string", enum: ["A4", "Letter"] },
      },
    },
    personalInfo: {
      type: "object",
      additionalProperties: true,
      properties: {
        fullName: { type: "string" },
        headline: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        location: { type: "string" },
        website: { type: "string" },
        linkedin: { type: "string" },
        github: { type: "string" },
      },
    },
    summary: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
        properties: {
          kind: {
            type: "string",
            enum: [
              "experience",
              "education",
              "skills",
              "projects",
              "certifications",
              "languages",
              "awards",
              "custom",
            ],
          },
          title: { type: "string" },
          visible: { type: "boolean" },
          entries: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: true,
              properties: {
                title: { type: "string" },
                subtitle: { type: "string" },
                organization: { type: "string" },
                location: { type: "string" },
                startDate: { type: "string" },
                endDate: { type: "string" },
                isCurrent: { type: "boolean" },
                bullets: { type: "array", items: { type: "string" } },
                tags: { type: "array", items: { type: "string" } },
                description: { type: "string" },
                link: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const;

/**
 * Gemini `generationConfig.responseSchema` uses the OpenAPI 3 / protobuf
 * Schema shape. Official REST curl examples encode Type as uppercase enums
 * (`OBJECT`, `STRING`, `ARRAY`, …). See
 * https://ai.google.dev/api/generate-content
 */
export const geminiResumeResponseSchema = {
  type: "OBJECT",
  properties: {
    schemaVersion: { type: "INTEGER" },
    meta: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        pageSize: { type: "STRING", enum: ["A4", "Letter"] },
      },
    },
    personalInfo: {
      type: "OBJECT",
      properties: {
        fullName: { type: "STRING" },
        headline: { type: "STRING" },
        email: { type: "STRING" },
        phone: { type: "STRING" },
        location: { type: "STRING" },
        website: { type: "STRING" },
        linkedin: { type: "STRING" },
        github: { type: "STRING" },
      },
    },
    summary: { type: "STRING" },
    sections: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          kind: {
            type: "STRING",
            enum: [
              "experience",
              "education",
              "skills",
              "projects",
              "certifications",
              "languages",
              "awards",
              "custom",
            ],
          },
          title: { type: "STRING" },
          visible: { type: "BOOLEAN" },
          entries: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                subtitle: { type: "STRING" },
                organization: { type: "STRING" },
                location: { type: "STRING" },
                startDate: { type: "STRING" },
                endDate: { type: "STRING" },
                isCurrent: { type: "BOOLEAN" },
                bullets: { type: "ARRAY", items: { type: "STRING" } },
                tags: { type: "ARRAY", items: { type: "STRING" } },
                description: { type: "STRING" },
                link: { type: "STRING" },
              },
            },
          },
        },
      },
    },
  },
} as const;
