import type { ResumeData } from "@/lib/schema/resume";

export type ResumeAccessLevel = "owner" | "editor" | "viewer";

export interface ResumeAccessEntry {
  resume: ResumeData;
  access: ResumeAccessLevel;
  ownerEmail: string;
}

export interface ShareableUser {
  id: string;
  email: string;
}

export interface ResumeShare {
  userId: string;
  email: string;
  permission: "viewer" | "editor";
}

async function readJsonOrThrow<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `${fallback} (status: ${res.status})`);
  }
  return (await res.json()) as T;
}

/**
 * Every resume the current user owns or has been shared, with per-resume
 * access level — the richer sibling of resumeRepository.list(), which stays
 * on the plain StorageAdapter<ResumeData> contract. Dashboard-only concern.
 */
export async function listResumesWithAccess(): Promise<ResumeAccessEntry[]> {
  const res = await fetch("/api/resumes", { method: "GET" });
  return readJsonOrThrow<ResumeAccessEntry[]>(res, "Failed to list resumes");
}

/** The caller's access level for one resume — used by the editor to decide
 * whether to render read-only. */
export async function getResumeAccess(
  id: string,
): Promise<{ access: ResumeAccessLevel; ownerEmail: string }> {
  const res = await fetch(`/api/resumes/${encodeURIComponent(id)}/access`, {
    method: "GET",
  });
  return readJsonOrThrow(res, "Failed to load resume access");
}

/** Every other user in the system, for the Share dialog's people list. */
export async function listShareableUsers(): Promise<ShareableUser[]> {
  const res = await fetch("/api/users", { method: "GET" });
  return readJsonOrThrow<ShareableUser[]>(res, "Failed to list users");
}

/** Current share list for a resume. Owner-only server-side. */
export async function getResumeShares(id: string): Promise<ResumeShare[]> {
  const res = await fetch(`/api/resumes/${encodeURIComponent(id)}/shares`, {
    method: "GET",
  });
  return readJsonOrThrow<ResumeShare[]>(res, "Failed to load current shares");
}

/** Replaces a resume's entire share set. Owner-only server-side. */
export async function updateResumeShares(
  id: string,
  shares: Array<{ userId: string; permission: "viewer" | "editor" }>,
): Promise<void> {
  const res = await fetch(`/api/resumes/${encodeURIComponent(id)}/shares`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shares }),
  });
  await readJsonOrThrow(res, "Failed to update sharing");
}
