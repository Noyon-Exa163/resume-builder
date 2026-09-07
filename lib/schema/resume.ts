import { z } from "zod";

/**
 * Single source of truth for resume data. Consumed by the editor, every
 * template, every export formatter, and both import paths (heuristic + AI).
 * Bump `schemaVersion` and add a migration in normalizeAndValidate() if this
 * shape ever changes in a breaking way — stored IndexedDB records and
 * exported .json project files carry their schemaVersion forward.
 */

export const EntrySchema = z.object({
  id: z.string(),
  title: z.string().default(""),
  subtitle: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional(),
  bullets: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
  /** Free text, not a strict URL — see PersonalInfoSchema. */
  link: z.string().optional(),
});
export type ResumeEntry = z.infer<typeof EntrySchema>;

export const SectionKind = z.enum([
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "languages",
  "awards",
  "custom",
]);
export type SectionKind = z.infer<typeof SectionKind>;

export const SectionLayout = z.enum(["list", "grid", "tags"]);
export type SectionLayout = z.infer<typeof SectionLayout>;

export const SectionSchema = z.object({
  id: z.string(),
  kind: SectionKind,
  title: z.string(),
  visible: z.boolean().default(true),
  layout: SectionLayout.default("list"),
  entries: z.array(EntrySchema).default([]),
});
export type ResumeSection = z.infer<typeof SectionSchema>;

/**
 * Contact details are stored as free text rather than strictly formatted
 * values. The editor autosaves a draft while the user is still typing, so a
 * half-written address ("jane@", "janedoe.d") must not make the draft
 * unsaveable. Format is checked in the form UI, where it can be shown to the
 * person who can fix it, instead of throwing on the persistence path.
 */
export const PersonalInfoSchema = z.object({
  fullName: z.string().default(""),
  headline: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  /** Optional headshot as a data URL. Templates decide whether to render it. */
  photoDataUrl: z.string().optional(),
});
export type PersonalInfo = z.infer<typeof PersonalInfoSchema>;

export const PageSize = z.enum(["A4", "Letter"]);
export type PageSize = z.infer<typeof PageSize>;

export const ResumeMetaSchema = z.object({
  id: z.string(),
  title: z.string().default("Untitled Resume"),
  createdAt: z.string(),
  updatedAt: z.string(),
  templateId: z.string().default("exabyting"),
  pageSize: PageSize.default("A4"),
});

export const ResumeDataSchema = z.object({
  schemaVersion: z.literal(1),
  meta: ResumeMetaSchema,
  personalInfo: PersonalInfoSchema,
  summary: z.string().optional(),
  sections: z.array(SectionSchema).default([]),
});
export type ResumeData = z.infer<typeof ResumeDataSchema>;

export const CURRENT_SCHEMA_VERSION = 1 as const;
