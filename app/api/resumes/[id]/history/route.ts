import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listResumeHistory } from "@/lib/db/resumeHistory";
import { getResumeAccessLevel } from "@/lib/db/resumeQueries";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/resumes/[id]/history — who changed the resume and when, newest
 * first. Anyone who can open the resume (owner, shared user, Super Admin)
 * can read it; 404 for everyone else, same as the resume itself.
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
    return NextResponse.json(await listResumeHistory(id));
  } catch (error) {
    console.error("Failed to load resume history:", error);
    return NextResponse.json(
      { error: "Could not load the edit history. Please try again." },
      { status: 500 },
    );
  }
}
