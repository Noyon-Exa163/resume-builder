import type { ResumeHistoryEntry } from "@/lib/db/resumeHistory";
import type { ResumeVersionEntry } from "@/lib/db/resumeVersions";
import type { ResumeData } from "@/lib/schema/resume";

export type { ResumeHistoryEntry, ResumeVersionEntry };

async function fetchList<T>(url: string, fallback: string): Promise<T[]> {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || fallback);
  }
  return (await res.json()) as T[];
}

/** Who changed a resume and when, newest first. Throws with a readable message on failure. */
export function listResumeHistory(
  resumeId: string,
): Promise<ResumeHistoryEntry[]> {
  return fetchList(
    `/api/resumes/${encodeURIComponent(resumeId)}/history`,
    "Could not load the edit history.",
  );
}

/** The last saved versions of a resume, newest first. */
export function listResumeVersions(
  resumeId: string,
): Promise<ResumeVersionEntry[]> {
  return fetchList(
    `/api/resumes/${encodeURIComponent(resumeId)}/versions`,
    "Could not load the versions.",
  );
}

async function readJsonOrThrow<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || fallback);
  }
  return (await res.json()) as T;
}

/** The full resume content as saved in one version. */
export async function getResumeVersion(
  resumeId: string,
  versionId: string,
): Promise<ResumeData> {
  const res = await fetch(
    `/api/resumes/${encodeURIComponent(resumeId)}/versions/${encodeURIComponent(versionId)}`,
    { method: "GET" },
  );
  return readJsonOrThrow(res, "Could not load that version.");
}

/** Replaces the resume's current content with a version; returns the restored resume. */
export async function restoreResumeVersion(
  resumeId: string,
  versionId: string,
): Promise<ResumeData> {
  const res = await fetch(
    `/api/resumes/${encodeURIComponent(resumeId)}/versions/${encodeURIComponent(versionId)}/restore`,
    { method: "POST" },
  );
  return readJsonOrThrow(res, "Could not restore that version.");
}
