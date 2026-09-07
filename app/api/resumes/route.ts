import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { ResumeDataSchema } from "@/lib/schema/resume";
import type { ResumeAccessEntry } from "@/lib/storage/api/resumeAccess";

interface ResumeAccessRow {
  id: string;
  data: unknown;
  owner_id: string;
  owner_email: string;
  permission: "viewer" | "editor" | null;
}

/**
 * GET /api/resumes — every resume the current user owns or has been shared
 * (see db/migrations/0003_resume_shares.sql), newest-updated first.
 * Rejects with 401 if unauthenticated.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = (await sql`
    SELECT r.id, r.data, r.user_id AS owner_id, u.email AS owner_email, rs.permission
    FROM resumes r
    JOIN users u ON u.id = r.user_id
    LEFT JOIN resume_shares rs
      ON rs.resume_id = r.id AND rs.shared_with_user_id = ${user.id}
    WHERE r.user_id = ${user.id} OR rs.shared_with_user_id = ${user.id}
    ORDER BY r.updated_at DESC
  `) as ResumeAccessRow[];

  const entries: ResumeAccessEntry[] = [];
  for (const row of rows) {
    const parsed = ResumeDataSchema.safeParse(row.data);
    if (!parsed.success) continue;
    entries.push({
      resume: parsed.data,
      access: row.owner_id === user.id ? "owner" : (row.permission ?? "viewer"),
      ownerEmail: row.owner_email,
    });
  }

  return NextResponse.json(entries);
}

/**
 * POST /api/resumes — create or upsert a resume for the current user.
 * Body must be a valid ResumeData object.
 * Rejects with 401 if unauthenticated. Allowed for the owner, or for a user
 * with "editor" access via resume_shares.
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

  // If the record exists, ensure the current user may write to it (owner or
  // an editor share) before updating.
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
    !existing[0].can_edit
  ) {
    // Return 404 to avoid leaking existence of another user's resume
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await sql`
    INSERT INTO resumes (id, user_id, data, created_at, updated_at)
    VALUES (${resumeId}, ${user.id}, ${resumeJson}::jsonb, now(), now())
    ON CONFLICT (id) DO UPDATE
    SET data = EXCLUDED.data,
        updated_at = now()
    WHERE resumes.user_id = ${user.id}
      OR EXISTS (
        SELECT 1 FROM resume_shares
        WHERE resume_id = resumes.id AND shared_with_user_id = ${user.id} AND permission = 'editor'
      )
  `;

  return NextResponse.json(resume, { status: existing.length > 0 ? 200 : 201 });
}
