import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { canManageAllResumes, resolveResumeAccess } from "@/lib/auth/permissions";
import { ResumeDataSchema } from "@/lib/schema/resume";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ResumeRow {
  id: string;
  user_id: string;
  data: unknown;
  owner_email: string;
  permission: "viewer" | "editor" | null;
}

/**
 * GET /api/resumes/[id]
 * Returns the resume together with the caller's access level and the
 * owner's email — the editor needs both on load (to render, and to decide
 * whether to render read-only), so this is one round trip instead of a
 * second GET to /api/resumes/[id]/access.
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

  const rows = (await sql`
    SELECT r.id, r.user_id, r.data, u.email AS owner_email, rs.permission
    FROM resumes r
    JOIN users u ON u.id = r.user_id
    LEFT JOIN resume_shares rs
      ON rs.resume_id = r.id AND rs.shared_with_user_id = ${user.id}
    WHERE r.id = ${id}
  `) as ResumeRow[];

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = resolveResumeAccess({
    userId: user.id,
    userEmail: user.email,
    ownerId: row.user_id,
    sharePermission: row.permission,
  });
  if (!access) {
    // Same "Not found" as a missing row — a caller with no relationship to
    // this resume shouldn't learn it exists.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = ResumeDataSchema.safeParse(row.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Stored resume data corrupted" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    resume: parsed.data,
    access,
    ownerEmail: row.owner_email,
  });
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
