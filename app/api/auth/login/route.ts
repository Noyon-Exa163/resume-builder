import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  checkRateLimit,
  getClientIp,
  LOGIN_ACCOUNT_RULE,
  LOGIN_IP_RULE,
  rateLimitResponse,
} from "@/lib/rateLimit";
import {
  createUserSessionToken,
  USER_SESSION_COOKIE,
  USER_SESSION_MAX_AGE_SECONDS,
  USER_SESSION_REMEMBER_MAX_AGE_SECONDS,
} from "@/lib/auth/userSession";

/**
 * Verified against when the email is unknown, so an unknown email costs the
 * same scrypt work as a wrong password and response time can't reveal which
 * emails have accounts. Created once, on first use.
 */
let decoyHash: string | undefined;

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

  const { email, password, remember } = body as {
    email?: string;
    password?: string;
    remember?: boolean;
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

  const normalizedEmail = email.toLowerCase().trim();
  const ip = getClientIp(request);
  const [ipLimit, accountLimit] = await Promise.all([
    checkRateLimit(ip, LOGIN_IP_RULE),
    // Keyed by IP as well as email so a stranger can't lock a real user out.
    checkRateLimit(`${ip}:${normalizedEmail}`, LOGIN_ACCOUNT_RULE),
  ]);
  if (!ipLimit.allowed || !accountLimit.allowed) {
    return rateLimitResponse(
      Math.max(ipLimit.retryAfterSeconds, accountLimit.retryAfterSeconds),
    );
  }

  const rows = await sql`
    SELECT id, password_hash, session_version FROM users WHERE email = ${normalizedEmail}
  `;
  const user = rows[0] as
    | { id: string; password_hash: string; session_version: number }
    | undefined;

  if (!user) {
    decoyHash ??= hashPassword("decoy-password-for-timing");
    verifyPassword(password, decoyHash);
  }

  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json(
      { error: "Incorrect email or password." },
      { status: 401 },
    );
  }

  const token = createUserSessionToken(user.id, user.session_version);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(USER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: remember
      ? USER_SESSION_REMEMBER_MAX_AGE_SECONDS
      : USER_SESSION_MAX_AGE_SECONDS,
    path: "/",
  });

  return response;
}
