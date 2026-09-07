import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { ResumeDataSchema, type ResumeData } from "@/lib/schema/resume";

interface ResumeRow {
  id: string;
  user_id: string;
  data: unknown;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/resumes — list the current user's resumes.
 * Rejects with 401 if unauthenticated.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = (await sql`
    SELECT id, user_id, data, created_at, updated_at
    FROM resumes
    WHERE user_id = ${user.id}
    ORDER BY updated_at DESC
  `) as ResumeRow[];

  const resumes: ResumeData[] = [];
  for (const row of rows) {
    const parsed = ResumeDataSchema.safeParse(row.data);
    if (parsed.success) {
      resumes.push(parsed.data);
    }
  }

  return NextResponse.json(resumes);
}

/**
 * POST /api/resumes — create or upsert a resume for the current user.
 * Body must be a valid ResumeData object.
 * Rejects with 401 if unauthenticated.
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

  // If the record exists, ensure it is owned by the current user before updating
  const existing = (await sql`
    SELECT id, user_id FROM resumes WHERE id = ${resumeId}
  `) as Array<{ id: string; user_id: string }>;

  if (existing.length > 0 && existing[0].user_id !== user.id) {
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
  `;

  return NextResponse.json(resume, { status: existing.length > 0 ? 200 : 201 });
}
