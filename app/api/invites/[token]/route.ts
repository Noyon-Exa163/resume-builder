import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword } from "@/lib/auth/password";
import { createId } from "@/lib/utils/ids";
import {
  USER_SESSION_COOKIE,
  USER_SESSION_MAX_AGE_SECONDS,
  createUserSessionToken,
} from "@/lib/auth/userSession";
import {
  isAvatarExpressionKey,
  isAvatarHue,
} from "@/lib/avatar";
import { cookies } from "next/headers";

function requireAdmin(
  user: Awaited<ReturnType<typeof getCurrentUser>>,
): NextResponse | null {
  // 401 for no session at all, 403 for a signed-in non-admin — keeps client
  // handling and auth monitoring consistent with the rest of the API.
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 403 },
    );
  }
  return null;
}

/** GET /api/invites/[token] — validate an invite token (public). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const rows = await sql`
    SELECT id, email, expires_at, used_at, is_admin
    FROM invite_tokens
    WHERE token = ${token}
  `;
  const row = rows[0] as
    | {
        id: string;
        email: string;
        expires_at: string;
        used_at: string | null;
        is_admin: boolean;
      }
    | undefined;

  if (!row) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  if (row.used_at) {
    return NextResponse.json({ error: "This invite has already been used." }, { status: 410 });
  }

  if (new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite has expired." }, { status: 410 });
  }

  return NextResponse.json({
    valid: true,
    email: row.email,
    isAdmin: row.is_admin,
    expiresAt: row.expires_at,
  });
}

/** POST /api/invites/[token] — complete onboarding: set password + name, create user, start session. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, password, avatarHue, avatarExpression } = body as {
    name?: unknown;
    password?: unknown;
    avatarHue?: unknown;
    avatarExpression?: unknown;
  };

  if (
    typeof name !== "string" ||
    name.trim().length === 0 ||
    typeof password !== "string" ||
    password.length < 8
  ) {
    return NextResponse.json(
      { error: "A name and a password of at least 8 characters are required." },
      { status: 400 },
    );
  }

  // Optional profile details — only persisted when they're a real choice;
  // anything else stays null (the app then derives an avatar from the email).
  const hue = isAvatarHue(avatarHue) ? avatarHue : null;
  const expression = isAvatarExpressionKey(avatarExpression)
    ? avatarExpression
    : null;

  const rows = await sql`
    SELECT id, email, expires_at, used_at, is_admin
    FROM invite_tokens
    WHERE token = ${token}
  `;
  const row = rows[0] as
    | {
        id: string;
        email: string;
        expires_at: string;
        used_at: string | null;
        is_admin: boolean;
      }
    | undefined;

  if (!row) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  if (row.used_at) {
    return NextResponse.json({ error: "This invite has already been used." }, { status: 410 });
  }

  if (new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite has expired." }, { status: 410 });
  }

  // Check the email doesn't already have a user (fast, friendly pre-check —
  // the authoritative guard is the atomic claim + unique constraint below).
  const existingUser = await sql`
    SELECT id FROM users WHERE email = ${row.email}
  `;
  if (existingUser.length > 0) {
    return NextResponse.json(
      { error: "A user with that email already exists." },
      { status: 409 },
    );
  }

  const id = createId();
  const passwordHash = hashPassword(password);

  // Claim + create run in one transaction: the claim only matches an
  // unconsumed, unexpired invite, so two concurrent redemptions can't both
  // create the user, and a unique-violation (email registered moments ago)
  // maps to 409 instead of an unhandled 500.
  let sessionVersion: number | null;
  try {
    sessionVersion = await sql.begin(async (tx) => {
      const claimed = (await tx`
        UPDATE invite_tokens
        SET used_at = now()
        WHERE id = ${row.id} AND used_at IS NULL AND expires_at > now()
        RETURNING email, is_admin
      `) as Array<{ email: string; is_admin: boolean }>;

      if (claimed.length === 0) {
        // Lost a race — the invite was consumed or expired meanwhile.
        return null;
      }

      const inserted = (await tx`
        INSERT INTO users (id, name, email, password_hash, is_admin, avatar_hue, avatar_expression)
        VALUES (${id}, ${name.trim()}, ${claimed[0].email}, ${passwordHash}, ${claimed[0].is_admin}, ${hue}, ${expression})
        RETURNING session_version
      `) as Array<{ session_version: number }>;

      return inserted[0]?.session_version ?? 0;
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      (error as { code?: string }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "A user with that email already exists." },
        { status: 409 },
      );
    }
    throw error;
  }

  if (sessionVersion === null) {
    return NextResponse.json(
      { error: "This invite has already been used or has expired." },
      { status: 410 },
    );
  }

  // Create a session for the new user
  const sessionToken = createUserSessionToken(id, sessionVersion ?? 0);
  const cookieStore = await cookies();
  cookieStore.set(USER_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: USER_SESSION_MAX_AGE_SECONDS,
  });

  return NextResponse.json({
    id,
    name: name.trim(),
    email: row.email,
  }, { status: 201 });
}

/** DELETE /api/invites/[token] — revoke an outstanding invite (admin-only).
 *  Accepted invites are historical; revoking only ever deletes rows that
 *  haven't been used. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const user = await getCurrentUser();
  const denied = requireAdmin(user);
  if (denied) return denied;

  const { token } = await params;
  const deleted = (await sql`
    DELETE FROM invite_tokens
    WHERE token = ${token} AND used_at IS NULL
    RETURNING id
  `) as Array<{ id: string }>;

  if (deleted.length === 0) {
    return NextResponse.json(
      { error: "Invite not found, or it was already accepted." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
