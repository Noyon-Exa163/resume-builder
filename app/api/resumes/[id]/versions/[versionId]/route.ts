import { NextResponse } from "next/server";
import { parseJsonb } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { getResumeAccessLevel } from "@/lib/db/resumeQueries";
import { getResumeVersionSnapshot } from "@/lib/db/resumeVersions";
import { ResumeDataSchema } from "@/lib/schema/resume";

interface RouteParams {
  params: Promise<{ id: string; versionId: string }>;
}

/**
 * GET /api/resumes/[id]/versions/[versionId] — the full resume content as it
 * was in that version, for downloading it. Same access rules as the resume
 * itself; 404 for everyone else and for a version that no longer exists.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, versionId } = await params;
  if (!/^\d+$/.test(versionId) || !(await getResumeAccessLevel(user, id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const snapshot = await getResumeVersionSnapshot(id, versionId);
  if (snapshot === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = ResumeDataSchema.safeParse(parseJsonb(snapshot));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "This version's saved content is damaged." },
      { status: 500 },
    );
  }
  return NextResponse.json(parsed.data);
}
