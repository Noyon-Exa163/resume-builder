import type { ResumeHistoryEntry } from "@/lib/db/resumeHistory";
import type { ResumeVersionEntry } from "@/lib/db/resumeVersions";
import type { ResumeData } from "@/lib/schema/resume";
import { apiFetch } from "./apiFetch";

export type { ResumeHistoryEntry, ResumeVersionEntry };

/** Who changed a resume and when, newest first. Throws with a readable message on failure. */
export function listResumeHistory(
  resumeId: string,
): Promise<ResumeHistoryEntry[]> {
  return apiFetch(
    `/api/resumes/${encodeURIComponent(resumeId)}/history`,
    { fallbackError: "Could not load the edit history." },
  );
}

/** The last saved versions of a resume, newest first. */
export function listResumeVersions(
  resumeId: string,
): Promise<ResumeVersionEntry[]> {
  return apiFetch(
    `/api/resumes/${encodeURIComponent(resumeId)}/versions`,
    { fallbackError: "Could not load the versions." },
  );
}

/** The full resume content as saved in one version. */
export function getResumeVersion(
  resumeId: string,
  versionId: string,
): Promise<ResumeData> {
  return apiFetch(
    `/api/resumes/${encodeURIComponent(resumeId)}/versions/${encodeURIComponent(versionId)}`,
    { fallbackError: "Could not load that version." },
  );
}

/** Replaces the resume's current content with a version; returns the restored resume. */
export function restoreResumeVersion(
  resumeId: string,
  versionId: string,
): Promise<ResumeData> {
  return apiFetch(
    `/api/resumes/${encodeURIComponent(resumeId)}/versions/${encodeURIComponent(versionId)}/restore`,
    { method: "POST", fallbackError: "Could not restore that version." },
  );
}
