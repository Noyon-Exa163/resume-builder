import type { ResumeData } from "@/lib/schema/resume";

export type ResumeAccessLevel = "owner" | "editor" | "viewer" | "admin";

/** Owner controls (edit, share, delete) — Super Admin counts as this. */
export function canManageResume(access: ResumeAccessLevel): boolean {
  return access === "owner" || access === "admin";
}

export interface ResumeAccessEntry {
  resume: ResumeData;
  access: ResumeAccessLevel;
  ownerEmail: string;
  /** Only set by the list endpoint (dashboard), not the single-resume one. */
  ownerName?: string;
}

export interface ShareableUser {
  id: string;
  name: string;
  email: string;
}

export interface ResumeShare {
  userId: string;
  email: string;
  permission: "viewer" | "editor";
}

export interface ResumeSharesState {
  owner: ShareableUser;
  shares: ResumeShare[];
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
 * Super Admin also receives every resume in the system as access "admin"
 * (full edit / share / delete, without taking ownership).
 */
export async function listResumesWithAccess(): Promise<ResumeAccessEntry[]> {
  const res = await fetch("/api/resumes", { method: "GET" });
  return readJsonOrThrow<ResumeAccessEntry[]>(res, "Failed to list resumes");
}

/**
 * A resume plus the caller's access level and the owner's email, in one
 * request — what the editor needs on load, from the same endpoint
 * resumeRepository.get() uses (see that file's comment on why it only
 * returns the resume part). undefined on 404 (not found, or the caller has
 * no relationship to it), matching resumeRepository.get()'s convention.
 */
export async function getResumeWithAccess(id: string): Promise<
  | { resume: ResumeData; access: ResumeAccessLevel; ownerEmail: string }
  | undefined
> {
  const res = await fetch(`/api/resumes/${encodeURIComponent(id)}`, {
    method: "GET",
  });
  if (res.status === 404) return undefined;
  return readJsonOrThrow(res, "Failed to load resume");
}

/** Every other user in the system, for the Share dialog's people list. */
export async function listShareableUsers(): Promise<ShareableUser[]> {
  const res = await fetch("/api/users", { method: "GET" });
  return readJsonOrThrow<ShareableUser[]>(res, "Failed to list users");
}

/** Current share list for a resume, including who owns it. */
export async function getResumeShares(id: string): Promise<ResumeSharesState> {
  const res = await fetch(`/api/resumes/${encodeURIComponent(id)}/shares`, {
    method: "GET",
  });
  return readJsonOrThrow(res, "Failed to load current shares");
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
