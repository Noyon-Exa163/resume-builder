import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { verifyPassword } from "@/lib/auth/password";
import {
  createUserSessionToken,
  USER_SESSION_COOKIE,
  USER_SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/userSession";

/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 *
 * On success: sets a signed session cookie and returns 200.
 * On failure: returns a generic 401 (never leaks whether the email exists).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { email, password } = body as {
    email?: string;
    password?: string;
  };

  if (
    typeof email !== "string" ||
    email.length === 0 ||
    typeof password !== "string" ||
    password.length === 0
  ) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const rows = await sql`
    SELECT id, password_hash FROM users WHERE email = ${email.toLowerCase().trim()}
  `;
  const user = rows[0] as
    | { id: string; password_hash: string }
    | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json(
      { error: "Incorrect email or password." },
      { status: 401 },
    );
  }

  const token = createUserSessionToken(user.id);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(USER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: USER_SESSION_MAX_AGE_SECONDS,
    path: "/",
  });

  return response;
}
