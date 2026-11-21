import type { ResumeData } from "@/lib/schema/resume";
import type { StorageAdapter } from "@/lib/storage/types";
import { ApiError, apiFetch, apiFetchVoid } from "./apiFetch";
import type { ResumeAccessEntry } from "./resumeAccess";

/**
 * Client-side resume storage adapter backed by server-side Postgres API routes.
 * Scoped per logged-in user with edit/delete support.
 * Drop-in replacement for the old IndexedDB adapter.
 */
export const resumeRepository: StorageAdapter<ResumeData> = {
  // The route also returns the caller's access level and the owner's email
  // (see lib/storage/api/resumeAccess.ts's getResumeWithAccess, which the
  // editor uses instead of this plain StorageAdapter method when it needs
  // those too) — this adapter's contract is just the resume, so only that
  // part is returned here.
  async get(id: string): Promise<ResumeData | undefined> {
    try {
      const body = await apiFetch<{ resume: ResumeData }>(
        `/api/resumes/${encodeURIComponent(id)}`,
        { fallbackError: `Failed to fetch resume ${id}` },
      );
      return body.resume;
    } catch (error) {
      // A 404 means "no such resume (or no access)" — an expected, empty
      // answer for this adapter's contract rather than a failure.
      if (error instanceof ApiError && error.status === 404) {
        return undefined;
      }
      throw error;
    }
  },

  async list(): Promise<ResumeData[]> {
    const entries = await apiFetch<ResumeAccessEntry[]>("/api/resumes", {
      fallbackError: "Failed to list resumes",
    });
    return entries.map((entry) => entry.resume);
  },

  async set(id: string, value: ResumeData): Promise<void> {
    await apiFetchVoid("/api/resumes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(value),
      fallbackError: `Failed to save resume ${id}`,
    });
  },

  async delete(id: string): Promise<void> {
    try {
      await apiFetchVoid(`/api/resumes/${encodeURIComponent(id)}`, {
        method: "DELETE",
        fallbackError: `Failed to delete resume ${id}`,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return;
      }
      throw error;
    }
  },
};
