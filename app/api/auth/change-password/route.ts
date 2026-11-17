import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import {
  USER_SESSION_COOKIE,
  USER_SESSION_MAX_AGE_SECONDS,
  createUserSessionToken,
} from "@/lib/auth/userSession";

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
  // Bumping session_version revokes every existing session for this user
  // (a stolen cookie stops working the moment the password changes); the
  // fresh token issued below keeps THIS device logged in.
  const bumped = (await sql`
    UPDATE users
    SET password_hash = ${newHash}, session_version = session_version + 1
    WHERE id = ${user.id}
    RETURNING session_version
  `) as Array<{ session_version: number }>;

  const response = NextResponse.json({ ok: true });
  const newVersion = bumped[0]?.session_version;
  if (newVersion !== undefined) {
    response.cookies.set(
      USER_SESSION_COOKIE,
      createUserSessionToken(user.id, newVersion),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: USER_SESSION_MAX_AGE_SECONDS,
        path: "/",
      },
    );
  }

  return response;
}
