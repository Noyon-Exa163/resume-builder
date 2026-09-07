import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { verifyPassword, hashPassword } from "@/lib/auth/password";

/**
 * POST /api/auth/change-password
 * Requires a valid session. Verifies the current password, then updates to the new one.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "You must be logged in." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { currentPassword, newPassword } = body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (
    typeof currentPassword !== "string" ||
    currentPassword.length === 0 ||
    typeof newPassword !== "string" ||
    newPassword.length === 0
  ) {
    return NextResponse.json(
      { error: "Current password and new password are required." },
      { status: 400 },
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const rows = await sql`
    SELECT password_hash FROM users WHERE id = ${user.id}
  `;
  const row = rows[0] as { password_hash: string } | undefined;
  if (!row || !verifyPassword(currentPassword, row.password_hash)) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 401 },
    );
  }

  const newHash = hashPassword(newPassword);
  await sql`
    UPDATE users SET password_hash = ${newHash} WHERE id = ${user.id}
  `;

  return NextResponse.json({ ok: true });
}
