import type { ResumeData } from "@/lib/schema/resume";
import type { StorageAdapter } from "@/lib/storage/types";
import type { ResumeAccessEntry } from "./resumeAccess";

/**
 * Client-side resume storage adapter backed by server-side Postgres API routes.
 * Scoped per logged-in user with edit/delete support.
 * Drop-in replacement for lib/storage/indexeddb/resumeRepository.ts.
 */
export const resumeRepository: StorageAdapter<ResumeData> = {
  async get(id: string): Promise<ResumeData | undefined> {
    const res = await fetch(`/api/resumes/${encodeURIComponent(id)}`, {
      method: "GET",
    });

    if (res.status === 404) {
      return undefined;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(
        body?.error || `Failed to fetch resume ${id} (status: ${res.status})`,
      );
    }

    return (await res.json()) as ResumeData;
  },

  async list(): Promise<ResumeData[]> {
    const res = await fetch("/api/resumes", {
      method: "GET",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(
        body?.error || `Failed to list resumes (status: ${res.status})`,
      );
    }

    const entries = (await res.json()) as ResumeAccessEntry[];
    return entries.map((entry) => entry.resume);
  },

  async set(id: string, value: ResumeData): Promise<void> {
    const res = await fetch("/api/resumes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(value),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(
        body?.error || `Failed to save resume ${id} (status: ${res.status})`,
      );
    }
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`/api/resumes/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (res.status === 404) {
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(
        body?.error || `Failed to delete resume ${id} (status: ${res.status})`,
      );
    }
  },
};
