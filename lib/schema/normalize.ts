import { createId } from "@/lib/utils/ids";
import { fixBrandCasingDeep } from "@/lib/schema/brandCasing";
import { normalizeHeadline } from "./headline";
import {
  CURRENT_SCHEMA_VERSION,
  layoutForSection,
  ResumeDataSchema,
  type ResumeData,
  type ResumeEntry,
  type ResumeSection,
} from "./resume";

export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

/** Reuses `candidate` if present and not already claimed by an earlier
 *  sibling — otherwise mints a fresh id. Guards against a caller (e.g. an
 *  AI response that echoes ids it saw in the current resume) handing back
 *  the same id for two different sections/entries, which would otherwise
 *  reach the UI as a duplicate React key. */
function uniqueId(seen: Set<string>, candidate: string | undefined): string {
  const id = candidate && !seen.has(candidate) ? candidate : createId();
  seen.add(id);
  return id;
}

/**
 * Fills ids/defaults/timestamps on a partial resume (from a heuristic parse,
 * an AI extraction, or a fresh "new resume" action) and validates the result
 * against ResumeDataSchema. Every write path (editor save, import commit)
 * should go through this rather than trusting a shape at the boundary.
 */
export function normalizeAndValidate(
  partial: DeepPartial<ResumeData>,
): ResumeData {
  const now = new Date().toISOString();
  const seenSectionIds = new Set<string>();
  const seenEntryIds = new Set<string>();

  const sections: ResumeSection[] = (partial.sections ?? []).map((section) => {
    const kind = (section?.kind as ResumeSection["kind"]) ?? "custom";
    const title = section?.title ?? "";
    return {
      id: uniqueId(seenSectionIds, section?.id),
      kind,
      title,
      visible: section?.visible ?? true,
      layout: layoutForSection(kind, title),
      showSkillIcons: section?.showSkillIcons ?? false,
      entries: (section?.entries ?? []).map((entry): ResumeEntry => ({
        id: uniqueId(seenEntryIds, entry?.id),
        title: entry?.title ?? "",
        subtitle: entry?.subtitle,
        organization: entry?.organization,
        location: entry?.location,
        startDate: entry?.startDate,
        endDate: entry?.endDate,
        isCurrent: entry?.isCurrent,
        bullets: (entry?.bullets ?? []).filter(
          (b): b is string => typeof b === "string",
        ),
        tags: (entry?.tags ?? []).filter(
          (t): t is string => typeof t === "string",
        ),
        description: entry?.description,
        link: entry?.link,
        cgpa: entry?.cgpa,
        gpa: entry?.gpa,
        science: entry?.science,
      })),
    };
  });

  const candidate: ResumeData = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    meta: {
      id: partial.meta?.id ?? createId(),
      title: partial.meta?.title ?? "Untitled Resume",
      createdAt: partial.meta?.createdAt ?? now,
      updatedAt: now,
      templateId: partial.meta?.templateId ?? "exabyting",
      pageSize: partial.meta?.pageSize ?? "A4",
      nameCasing: partial.meta?.nameCasing ?? "uppercase",
      accentColor: partial.meta?.accentColor ?? "cyan",
      alternatePhoneVisible: partial.meta?.alternatePhoneVisible ?? false,
    },
    personalInfo: {
      fullName: partial.personalInfo?.fullName ?? "",
      headline: normalizeHeadline(partial.personalInfo?.headline),
      email: partial.personalInfo?.email,
      phone: partial.personalInfo?.phone,
      location: partial.personalInfo?.location,
      website: partial.personalInfo?.website,
      linkedin: partial.personalInfo?.linkedin,
      github: partial.personalInfo?.github,
      photoDataUrl: partial.personalInfo?.photoDataUrl,
    },
    summary: partial.summary,
    sections,
  };

  return ResumeDataSchema.parse(fixBrandCasingDeep(candidate));
}

export function createBlankResume(templateId?: string): ResumeData {
  return normalizeAndValidate({
    meta: templateId ? { templateId } : undefined,
  });
}

/**
 * Repairs a resume already sitting in storage with a duplicate section or
 * entry id — e.g. one written before normalizeAndValidate's id-dedup guard
 * existed. Unlike normalizeAndValidate, this never touches unrelated fields
 * (updatedAt, layout, ...); it only reassigns the second-and-later
 * occurrence of a reused id. Returns the exact same object when nothing
 * needed fixing, so callers can cheaply tell whether anything changed.
 */
export function dedupeResumeIds(resume: ResumeData): ResumeData {
  const seenSectionIds = new Set<string>();
  const seenEntryIds = new Set<string>();
  let changed = false;

  const sections = resume.sections.map((section) => {
    const sectionId = uniqueId(seenSectionIds, section.id);
    if (sectionId !== section.id) changed = true;

    const entries = section.entries.map((entry) => {
      const entryId = uniqueId(seenEntryIds, entry.id);
      if (entryId === entry.id) return entry;
      changed = true;
      return { ...entry, id: entryId };
    });

    return { ...section, id: sectionId, entries };
  });

  return changed ? { ...resume, sections } : resume;
}

/**
 * Backfills `meta` fields that were added to the schema with a default
 * after some resumes were already saved — e.g. `nameCasing`, absent from
 * any resume written before it existed. `resume.meta.nameCasing` is `undefined`
 * at runtime for those even though the type says it can't be, since load()
 * applies the stored JSON as-is (see dedupeResumeIds's doc comment for the
 * same situation with ids). Returns the exact same object when nothing
 * needed backfilling.
 */
export function backfillMetaDefaults(resume: ResumeData): ResumeData {
  const nameCasing = resume.meta.nameCasing ?? "uppercase";
  const accentColor = resume.meta.accentColor ?? "cyan";
  if (
    resume.meta.nameCasing === nameCasing &&
    resume.meta.accentColor === accentColor
  ) {
    return resume;
  }
  return {
    ...resume,
    meta: { ...resume.meta, nameCasing, accentColor },
  };
}
