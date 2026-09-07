import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
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
 * Returns 404 if not found OR not owned by the current user (don't leak existence).
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const rows = (await sql`
    SELECT id, user_id, data, created_at, updated_at
    FROM resumes
    WHERE id = ${id} AND user_id = ${user.id}
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
 * Updates an existing resume. Must belong to current user.
 * Returns 401 if unauthenticated.
 * Returns 404 if not found or not owned by current user.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

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

  // Confirm ownership and existence
  const existing = (await sql`
    SELECT id, user_id FROM resumes WHERE id = ${id} AND user_id = ${user.id}
  `) as Array<{ id: string; user_id: string }>;

  if (existing.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const resumeJson = JSON.stringify(resume);

  await sql`
    UPDATE resumes
    SET data = ${resumeJson}::jsonb,
        updated_at = now()
    WHERE id = ${id} AND user_id = ${user.id}
  `;

  return NextResponse.json(resume);
}

/**
 * DELETE /api/resumes/[id]
 * Deletes a resume. Must belong to current user.
 * Returns 401 if unauthenticated.
 * Returns 404 if not found or not owned by current user.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const result = (await sql`
    DELETE FROM resumes
    WHERE id = ${id} AND user_id = ${user.id}
    RETURNING id
  `) as Array<{ id: string }>;

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, id });
}
