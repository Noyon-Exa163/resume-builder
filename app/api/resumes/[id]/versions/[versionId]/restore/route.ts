import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { recordResumeActivity } from "@/lib/db/resumeActivity";
import { getResumeAccessLevel } from "@/lib/db/resumeQueries";
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
  const parsed = ResumeDataSchema.safeParse(snapshot);
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
  const restoredJson = JSON.stringify(restored);

  const updated = (await sql`
    UPDATE resumes
    SET data = ${restoredJson}::jsonb, updated_at = now()
    WHERE id = ${id}
    RETURNING id
  `) as Array<{ id: string }>;
  if (updated.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await recordResumeActivity({
    resumeId: id,
    userId: user.id,
    action: "edited",
    resumeJson: restoredJson,
  });

  return NextResponse.json(restored);
}
