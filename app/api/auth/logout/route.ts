import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import {
  USER_SESSION_COOKIE,
  verifyUserSessionToken,
} from "@/lib/auth/userSession";

/**
 * POST /api/auth/logout
 * Revokes the session server-side (bumps the user's session_version, so
 * even a copied cookie stops working everywhere) and clears this device's
 * cookie. Still succeeds with no valid session — idempotent.
 */
export async function POST() {
  const store = await cookies();
  const session = verifyUserSessionToken(store.get(USER_SESSION_COOKIE)?.value);
  if (session) {
    try {
      await sql`
        UPDATE users SET session_version = session_version + 1 WHERE id = ${session.userId}
      `;
    } catch (error) {
      // The cookie is cleared either way; a failed bump shouldn't stop the
      // user from logging out — the stale token still dies at its expiry.
      console.error("Failed to revoke session on logout:", error);
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(USER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
