import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { PROTECTED_ADMIN_EMAIL } from "@/lib/auth/constants";

/**
 * DELETE /api/admin/users/[id] — delete a user and their resumes (admin-only).
 * Cascade is handled by the FK constraint (ON DELETE CASCADE on resumes.user_id).
 * The permanent bootstrap admin (PROTECTED_ADMIN_EMAIL) can never be deleted
 * this way, so there's always at least one way into the app.
 */

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 403 },
    );
  }

  const { id } = await params;

  const existing = await sql`SELECT email FROM users WHERE id = ${id}`;
  const target = existing[0] as { email: string } | undefined;
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (target.email.toLowerCase() === PROTECTED_ADMIN_EMAIL) {
    return NextResponse.json(
      { error: "This account cannot be deleted." },
      { status: 403 },
    );
  }

  await sql`DELETE FROM users WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
