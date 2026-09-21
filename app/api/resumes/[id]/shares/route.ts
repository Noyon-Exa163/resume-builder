import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { canManageAllResumes } from "@/lib/auth/permissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const SharesUpdateSchema = z.object({
  shares: z.array(
    z.object({
      userId: z.string().min(1),
      permission: z.enum(["viewer", "editor"]),
    }),
  ),
});

async function getManageableResume(
  resumeId: string,
  userId: string,
  userEmail: string,
) {
  const manageAll = canManageAllResumes(userEmail);
  const rows = (await sql`
    SELECT r.id, r.user_id AS "ownerId", u.email AS "ownerEmail"
    FROM resumes r
    JOIN users u ON u.id = r.user_id
    WHERE r.id = ${resumeId} AND (${manageAll} OR r.user_id = ${userId})
  `) as Array<{ id: string; ownerId: string; ownerEmail: string }>;
  return rows[0] ?? null;
}

/**
 * GET /api/resumes/[id]/shares — current share list for a resume.
 * Owner or Super Admin; 404 (not 403) for anyone else, to avoid leaking existence.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const resume = await getManageableResume(id, user.id, user.email);
  if (!resume) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = (await sql`
    SELECT rs.shared_with_user_id AS "userId", u.email, rs.permission
    FROM resume_shares rs
    JOIN users u ON u.id = rs.shared_with_user_id
    WHERE rs.resume_id = ${id}
    ORDER BY u.email ASC
  `) as Array<{ userId: string; email: string; permission: string }>;

  return NextResponse.json({
    owner: { id: resume.ownerId, email: resume.ownerEmail },
    shares: rows,
  });
}

/**
 * PUT /api/resumes/[id]/shares — replaces the resume's entire share set with
 * the given list (Drive-style: the body is the full desired state, not a
 * diff). Owner or Super Admin.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const resume = await getManageableResume(id, user.id, user.email);
  if (!resume) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SharesUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid share list", details: parsed.error.issues },
      { status: 400 },
    );
  }

  // Deduplicated by user (last entry wins): the table's primary key is
  // (resume_id, shared_with_user_id), so a repeat would fail the whole update.
  const sharesByUser = new Map<string, "viewer" | "editor">();
  for (const share of parsed.data.shares) {
    if (share.userId !== resume.ownerId) {
      sharesByUser.set(share.userId, share.permission);
    }
  }
  const shares = [...sharesByUser].map(([userId, permission]) => ({
    userId,
    permission,
  }));

  await sql.transaction([
    sql`DELETE FROM resume_shares WHERE resume_id = ${id}`,
    ...shares.map(
      (share) => sql`
        INSERT INTO resume_shares (resume_id, shared_with_user_id, permission)
        VALUES (${id}, ${share.userId}, ${share.permission})
      `,
    ),
  ]);

  return NextResponse.json({ success: true });
}
