import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getResumeAccessLevel } from "@/lib/db/resumeQueries";
import { listResumeVersions } from "@/lib/db/resumeVersions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/resumes/[id]/versions — the last saved versions of the resume,
 * newest first. Same access rules as the resume itself; 404 for everyone else.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!(await getResumeAccessLevel(user, id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    return NextResponse.json(await listResumeVersions(id));
  } catch (error) {
    console.error("Failed to load resume versions:", error);
    return NextResponse.json(
      { error: "Could not load the versions. Please try again." },
      { status: 500 },
    );
  }
}
