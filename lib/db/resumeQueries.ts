import { parseJsonb, sql } from "@/lib/db/client";
import { ResumeDataSchema } from "@/lib/schema/resume";
import { canManageAllResumes, resolveResumeAccess } from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth";
import { avatarFromColumns } from "@/lib/avatar";
import type {
  ResumeAccessEntry,
  ResumeAccessLevel,
} from "@/lib/storage/api/resumeAccess";

interface ResumeAccessRow {
  id: string;
  data: unknown;
  owner_id: string;
  owner_email: string;
  owner_name: string | null;
  owner_avatar_hue: number | null;
  owner_avatar_expression: string | null;
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
    SELECT r.id,
      CASE
        WHEN jsonb_typeof(r.data) = 'object' THEN jsonb_set(r.data, '{sections}', '[]'::jsonb)
        ELSE '{}'::jsonb
      END AS data,
      r.user_id AS owner_id, u.email AS owner_email, u.name AS owner_name,
      u.avatar_hue AS owner_avatar_hue, u.avatar_expression AS owner_avatar_expression,
      rs.permission
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
    const parsed = ResumeDataSchema.safeParse(parseJsonb(row.data));
    if (!parsed.success) {
      console.warn(`Skipping resume ${row.id}: stored data failed validation.`);
      continue;
    }
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
      ownerName: row.owner_name?.trim() || row.owner_email.split("@")[0],
      ownerAvatar: avatarFromColumns(
        row.owner_avatar_hue,
        row.owner_avatar_expression,
      ),
    });
  }

  return entries;
}

/**
 * `user`'s access to one resume (owner, shared user or Super Admin), or null
 * when the resume doesn't exist or they have no relationship to it — callers
 * answer both with the same 404 so existence isn't leaked.
 */
export async function getResumeAccessLevel(
  user: CurrentUser,
  resumeId: string,
): Promise<ResumeAccessLevel | null> {
  const rows = (await sql`
    SELECT r.user_id, rs.permission
    FROM resumes r
    LEFT JOIN resume_shares rs
      ON rs.resume_id = r.id AND rs.shared_with_user_id = ${user.id}
    WHERE r.id = ${resumeId}
  `) as Array<{ user_id: string; permission: "viewer" | "editor" | null }>;

  const row = rows[0];
  if (!row) return null;
  return resolveResumeAccess({
    userId: user.id,
    userEmail: user.email,
    ownerId: row.user_id,
    sharePermission: row.permission,
  });
}
