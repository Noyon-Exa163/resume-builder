import { createId } from "@/lib/utils/ids";
import { normalizeHeadline } from "./headline";
import {
  CURRENT_SCHEMA_VERSION,
  defaultLayoutForKind,
  ResumeDataSchema,
  type ResumeData,
  type ResumeEntry,
  type ResumeSection,
} from "./resume";

export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

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

  const sections: ResumeSection[] = (partial.sections ?? []).map((section) => {
    const kind = (section?.kind as ResumeSection["kind"]) ?? "custom";
    return {
      id: section?.id ?? createId(),
      kind,
      title: section?.title ?? "",
      visible: section?.visible ?? true,
      // How a section is arranged follows from what it holds, so importers
      // don't each get to pick — see DEFAULT_SECTION_LAYOUT.
      layout:
        (section?.layout as ResumeSection["layout"]) ??
        defaultLayoutForKind(kind),
      entries: (section?.entries ?? []).map((entry): ResumeEntry => ({
        id: entry?.id ?? createId(),
        title: entry?.title ?? "",
        subtitle: entry?.subtitle,
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

  return ResumeDataSchema.parse(candidate);
}

export function createBlankResume(): ResumeData {
  return normalizeAndValidate({});
}
