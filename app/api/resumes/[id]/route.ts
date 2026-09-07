import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { canManageAllResumes } from "@/lib/auth/permissions";
import { ResumeDataSchema } from "@/lib/schema/resume";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ResumeRow {
  id: string;
  user_id: string;
  data: unknown;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/resumes/[id]
 * Returns 401 if unauthenticated.
 * Returns 404 if not found, or the caller is neither the owner, a user
 * the resume has been shared with (see db/migrations/0003_resume_shares.sql),
 * nor the protected Super Admin (org-wide full access).
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const manageAll = canManageAllResumes(user.email);

  const rows = (await sql`
    SELECT r.id, r.user_id, r.data, r.created_at, r.updated_at
    FROM resumes r
    LEFT JOIN resume_shares rs
      ON rs.resume_id = r.id AND rs.shared_with_user_id = ${user.id}
    WHERE r.id = ${id}
      AND (
        ${manageAll}
        OR r.user_id = ${user.id}
        OR rs.shared_with_user_id = ${user.id}
      )
  `) as ResumeRow[];

  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = ResumeDataSchema.safeParse(rows[0].data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Stored resume data corrupted" },
      { status: 500 },
    );
  }

  return NextResponse.json(parsed.data);
}

/**
 * PUT /api/resumes/[id]
 * Updates an existing resume. Must belong to the current user, the
 * current user must have "editor" access via resume_shares, or the
 * caller is the protected Super Admin.
 * Returns 401 if unauthenticated.
 * Returns 404 if not found or not writable by the current user.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const manageAll = canManageAllResumes(user.email);

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

  // Confirm the caller may write to this resume (owner, editor share, or Super Admin)
  const existing = (await sql`
    SELECT r.id
    FROM resumes r
    LEFT JOIN resume_shares rs
      ON rs.resume_id = r.id AND rs.shared_with_user_id = ${user.id} AND rs.permission = 'editor'
    WHERE r.id = ${id}
      AND (
        ${manageAll}
        OR r.user_id = ${user.id}
        OR rs.shared_with_user_id = ${user.id}
      )
  `) as Array<{ id: string }>;

  if (existing.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const resumeJson = JSON.stringify(resume);

  await sql`
    UPDATE resumes
    SET data = ${resumeJson}::jsonb,
        updated_at = now()
    WHERE id = ${id}
      AND (
        ${manageAll}
        OR user_id = ${user.id}
        OR EXISTS (
          SELECT 1 FROM resume_shares
          WHERE resume_id = resumes.id AND shared_with_user_id = ${user.id} AND permission = 'editor'
        )
      )
  `;

  return NextResponse.json(resume);
}

/**
 * DELETE /api/resumes/[id]
 * Deletes a resume. Owner-only for ordinary users; the protected Super
 * Admin may delete any resume. Editor shares cannot delete.
 * Returns 401 if unauthenticated.
 * Returns 404 if not found or not deletable by the current user.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const manageAll = canManageAllResumes(user.email);

  const result = (await sql`
    DELETE FROM resumes
    WHERE id = ${id} AND (${manageAll} OR user_id = ${user.id})
    RETURNING id
  `) as Array<{ id: string }>;

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, id });
}
