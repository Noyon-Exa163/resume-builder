import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { recordResumeActivity } from "@/lib/db/resumeActivity";
import { canManageAllResumes } from "@/lib/auth/permissions";
import { ResumeDataSchema } from "@/lib/schema/resume";
import { listResumesForUser } from "@/lib/db/resumeQueries";

/**
 * GET /api/resumes — every resume the current user owns or has been shared,
 * newest-updated first (see lib/db/resumeQueries.ts for the query and why
 * section bodies are stripped for this list view). Rejects with 401 if
 * unauthenticated. Kept as a route (rather than inlined into the dashboard
 * server render) because mutation flows still call it, and it's the same
 * endpoint the client-side StorageAdapter contract expects.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await listResumesForUser(user);
  return NextResponse.json(entries);
}

/**
 * POST /api/resumes — create or upsert a resume for the current user.
 * Body must be a valid ResumeData object.
 * Rejects with 401 if unauthenticated. Allowed for the owner, a user
 * with "editor" access via resume_shares, or the protected Super Admin.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ResumeDataSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid resume data", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const resume = parsed.data;
  const resumeId = resume.meta.id;
  const resumeJson = JSON.stringify(resume);

  const manageAll = canManageAllResumes(user.email);

  // If the record exists, ensure the current user may write to it (owner,
  // editor share, or Super Admin) before updating. Super Admin updates
  // leave user_id untouched so the original owner keeps the resume.
  const existing = (await sql`
    SELECT r.id, r.user_id,
      EXISTS (
        SELECT 1 FROM resume_shares
        WHERE resume_id = r.id AND shared_with_user_id = ${user.id} AND permission = 'editor'
      ) AS can_edit
    FROM resumes r
    WHERE r.id = ${resumeId}
  `) as Array<{ id: string; user_id: string; can_edit: boolean }>;

  if (
    existing.length > 0 &&
    existing[0].user_id !== user.id &&
    !existing[0].can_edit &&
    !manageAll
  ) {
    // Return 404 to avoid leaking existence of another user's resume
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const written = (await sql`
    INSERT INTO resumes (id, user_id, data, created_at, updated_at)
    VALUES (${resumeId}, ${user.id}, ${resumeJson}::jsonb, now(), now())
    ON CONFLICT (id) DO UPDATE
    SET data = EXCLUDED.data,
        updated_at = now()
    WHERE ${manageAll}
      OR resumes.user_id = ${user.id}
      OR EXISTS (
        SELECT 1 FROM resume_shares
        WHERE resume_id = resumes.id AND shared_with_user_id = ${user.id} AND permission = 'editor'
      )
    RETURNING id
  `) as Array<{ id: string }>;

  if (written.length > 0) {
    await recordResumeActivity({
      resumeId,
      userId: user.id,
      action: existing.length > 0 ? "edited" : "created",
      resumeJson,
    });
  }

  return NextResponse.json(resume, { status: existing.length > 0 ? 200 : 201 });
}
