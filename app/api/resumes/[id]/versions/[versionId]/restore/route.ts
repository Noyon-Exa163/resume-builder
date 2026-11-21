import { NextResponse } from "next/server";
import { parseJsonb, sql } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { canManageAllResumes } from "@/lib/auth/permissions";
import { recordResumeActivity } from "@/lib/db/resumeActivity";
import { getResumeAccessLevel, revalidateResumeCaches } from "@/lib/db/resumeQueries";
import { getResumeVersionSnapshot } from "@/lib/db/resumeVersions";
import { ResumeDataSchema } from "@/lib/schema/resume";

interface RouteParams {
  params: Promise<{ id: string; versionId: string }>;
}

/**
 * POST /api/resumes/[id]/versions/[versionId]/restore — replaces the resume's
 * current content with that version. Needs edit access (owner, editor share
 * or Super Admin); it is recorded like any other edit, so it appears in the
 * edit history and starts the restorer's version countdown.
 */
export async function POST(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, versionId } = await params;
  const access = /^\d+$/.test(versionId)
    ? await getResumeAccessLevel(user, id)
    : null;
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (access === "viewer") {
    return NextResponse.json(
      { error: "You don't have permission to restore versions of this resume." },
      { status: 403 },
    );
  }

  const snapshot = await getResumeVersionSnapshot(id, versionId);
  const parsed = ResumeDataSchema.safeParse(parseJsonb(snapshot));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That version no longer exists or its saved content is damaged." },
      { status: 404 },
    );
  }

  // The id always stays this resume's, whatever the snapshot says.
  const restored = {
    ...parsed.data,
    meta: {
      ...parsed.data.meta,
      id,
      updatedAt: new Date().toISOString(),
    },
  };
  // Bind the object itself — postgres.js serializes it to JSON for the
  // ::jsonb cast. Pre-stringifying would store a double-encoded string
  // scalar (see db/migrations/0011). The access level was checked above,
  // but the write re-asserts it in its own WHERE so a share revoked between
  // the check and this statement can't restore anything.
  const manageAll = canManageAllResumes(user.email);
  const updated = (await sql`
    UPDATE resumes
    SET data = ${restored}::jsonb, updated_at = now()
    WHERE id = ${id}
      AND (
        ${manageAll}
        OR user_id = ${user.id}
        OR EXISTS (
          SELECT 1 FROM resume_shares
          WHERE resume_id = resumes.id
            AND shared_with_user_id = ${user.id}
            AND permission = 'editor'
        )
      )
    RETURNING id
  `) as Array<{ id: string }>;
  if (updated.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await recordResumeActivity({
    resumeId: id,
    userId: user.id,
    action: "edited",
    snapshot: restored,
  });

  revalidateResumeCaches();
  return NextResponse.json(restored);
}
