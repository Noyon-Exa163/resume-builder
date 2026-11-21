import type { AvatarPreferences } from "@/lib/avatar";
import type { ResumeData } from "@/lib/schema/resume";
import { ApiError, apiFetch, apiFetchVoid } from "./apiFetch";

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
  ownerAvatar?: AvatarPreferences;
}

export interface ShareableUser {
  id: string;
  name: string;
  email: string;
  avatar: AvatarPreferences;
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

/**
 * Every resume the current user owns or has been shared, with per-resume
 * access level — the richer sibling of resumeRepository.list(), which stays
 * on the plain StorageAdapter<ResumeData> contract. Dashboard-only concern.
 * Super Admin also receives every resume in the system as access "admin"
 * (full edit / share / delete, without taking ownership).
 */
export async function listResumesWithAccess(): Promise<ResumeAccessEntry[]> {
  return apiFetch<ResumeAccessEntry[]>("/api/resumes", {
    fallbackError: "Failed to list resumes",
  });
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
  try {
    return await apiFetch<{
      resume: ResumeData;
      access: ResumeAccessLevel;
      ownerEmail: string;
    }>(`/api/resumes/${encodeURIComponent(id)}`, {
      fallbackError: "Failed to load resume",
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return undefined;
    throw error;
  }
}

/** Every other user in the system, for the Share dialog's people list. */
export async function listShareableUsers(): Promise<ShareableUser[]> {
  return apiFetch<ShareableUser[]>("/api/users", {
    fallbackError: "Failed to list users",
  });
}

/** Current share list for a resume, including who owns it. */
export async function getResumeShares(id: string): Promise<ResumeSharesState> {
  return apiFetch<ResumeSharesState>(
    `/api/resumes/${encodeURIComponent(id)}/shares`,
    { fallbackError: "Failed to load current shares" },
  );
}

/** Replaces a resume's entire share set. Owner-only server-side. */
export async function updateResumeShares(
  id: string,
  shares: Array<{ userId: string; permission: "viewer" | "editor" }>,
): Promise<void> {
  await apiFetchVoid(`/api/resumes/${encodeURIComponent(id)}/shares`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shares }),
    fallbackError: "Failed to update sharing",
  });
}
