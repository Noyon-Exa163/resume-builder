import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/resumes/[id]/access — the caller's relationship to a resume, for
 * the editor to decide whether to render read-only. 404 if the caller has
 * no relationship to the resume (not owner, not shared with).
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const rows = (await sql`
    SELECT r.user_id AS "ownerId", u.email AS "ownerEmail", rs.permission
    FROM resumes r
    JOIN users u ON u.id = r.user_id
    LEFT JOIN resume_shares rs
      ON rs.resume_id = r.id AND rs.shared_with_user_id = ${user.id}
    WHERE r.id = ${id}
  `) as Array<{ ownerId: string; ownerEmail: string; permission: string | null }>;

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = row.ownerId === user.id;
  if (!isOwner && !row.permission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    access: isOwner ? "owner" : row.permission,
    ownerEmail: row.ownerEmail,
  });
}
