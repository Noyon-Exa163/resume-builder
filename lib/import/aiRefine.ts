import type { ResumeData } from "@/lib/schema/resume";

/**
 * Client-side entry point for the editor's "refine with AI" prompt bar —
 * talks only to /api/import/ai-refine, mirroring aiParser.ts's shape (never
 * calls lib/ai/lib/storage/settings directly; those are server-only).
 */
export async function refineResumeWithAi(
  resume: ResumeData,
  instruction: string,
): Promise<{ json: unknown }> {
  const res = await fetch("/api/import/ai-refine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume, instruction }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `AI refine failed (status ${res.status})`);
  }

  return res.json();
}
