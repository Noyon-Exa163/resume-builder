import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { avatarFromColumns } from "@/lib/avatar";
import { hashPassword } from "@/lib/auth/password";
import { createId } from "@/lib/utils/ids";

/**
 * GET /api/admin/users — list all users (admin-only).
 * POST /api/admin/users — create a user with email + initial password (admin-only).
 */

function requireAdmin(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 403 },
    );
  }
  return null;
}

export async function GET() {
  const user = await getCurrentUser();
  const denied = requireAdmin(user);
  if (denied) return denied;

  const rows = await sql`
    SELECT id, email, name, is_admin, created_at, avatar_hue, avatar_expression
    FROM users ORDER BY created_at ASC
  `;

  return NextResponse.json(
    (rows as Array<{ id: string; email: string; name: string | null; is_admin: boolean; created_at: string; avatar_hue: number | null; avatar_expression: string | null }>).map(
      (r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        isAdmin: r.is_admin,
        createdAt: r.created_at,
        avatar: avatarFromColumns(r.avatar_hue, r.avatar_expression),
      }),
    ),
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const denied = requireAdmin(user);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { name, email, password, isAdmin: isAdminInput } = body as {
    name?: string;
    email?: string;
    password?: string;
    isAdmin?: unknown;
  };

  if (
    typeof name !== "string" ||
    name.trim().length === 0 ||
    typeof email !== "string" ||
    email.length === 0 ||
    typeof password !== "string" ||
    password.length < 6
  ) {
    return NextResponse.json(
      { error: "A name, an email, and a password of at least 6 characters are required." },
      { status: 400 },
    );
  }

  const isAdmin = isAdminInput === true;

  const existing = await sql`
    SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}
  `;
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "A user with that email already exists." },
      { status: 409 },
    );
  }

  const id = createId();
  const passwordHash = hashPassword(password);

  await sql`
    INSERT INTO users (id, name, email, password_hash, is_admin)
    VALUES (${id}, ${name.trim()}, ${email.toLowerCase().trim()}, ${passwordHash}, ${isAdmin})
  `;

  return NextResponse.json({ id, name: name.trim(), email: email.toLowerCase().trim(), isAdmin }, { status: 201 });
}
