import { sql } from "@/lib/db/client";
import { ResumeDataSchema } from "@/lib/schema/resume";
import { canManageAllResumes, resolveResumeAccess } from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth";
import type { ResumeAccessEntry } from "@/lib/storage/api/resumeAccess";

interface ResumeAccessRow {
  id: string;
  data: unknown;
  owner_id: string;
  owner_email: string;
  permission: "viewer" | "editor" | null;
}

/**
 * Every resume `user` owns or has been shared (see
 * db/migrations/0003_resume_shares.sql), newest-updated first. The protected
 * Super Admin also receives every resume in the system with access "admin".
 *
 * Section bodies are zeroed out in the query itself: dashboard cards only
 * render the header/summary crop (components/dashboard/ResumeCardPreview.tsx
 * and lib/export/resumeThumbnail.ts already drop sections client-side for
 * the same reason), so there's no reason to ship or JSON-parse that part of
 * the document for a list view — the editor's single-resume route
 * (app/api/resumes/[id]/route.ts) still returns sections in full.
 *
 * Shared by the dashboard's server render (app/page.tsx) and
 * GET /api/resumes so the query and the slimming live in exactly one place.
 */
export async function listResumesForUser(
  user: CurrentUser,
): Promise<ResumeAccessEntry[]> {
  const manageAll = canManageAllResumes(user.email);

  const rows = (await sql`
    SELECT r.id, jsonb_set(r.data, '{sections}', '[]'::jsonb) AS data,
      r.user_id AS owner_id, u.email AS owner_email, rs.permission
    FROM resumes r
    JOIN users u ON u.id = r.user_id
    LEFT JOIN resume_shares rs
      ON rs.resume_id = r.id AND rs.shared_with_user_id = ${user.id}
    WHERE ${manageAll}
      OR r.user_id = ${user.id}
      OR rs.shared_with_user_id = ${user.id}
    ORDER BY r.updated_at DESC
  `) as ResumeAccessRow[];

  const entries: ResumeAccessEntry[] = [];
  for (const row of rows) {
    const parsed = ResumeDataSchema.safeParse(row.data);
    if (!parsed.success) continue;
    const access = resolveResumeAccess({
      userId: user.id,
      userEmail: user.email,
      ownerId: row.owner_id,
      sharePermission: row.permission,
    });
    if (!access) continue;
    entries.push({
      resume: parsed.data,
      access,
      ownerEmail: row.owner_email,
    });
  }

  return entries;
}
