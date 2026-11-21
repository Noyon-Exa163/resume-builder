import { NextResponse } from "next/server";
import { revalidateTag, unstable_cache } from "next/cache";
import { sql } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { avatarFromColumns } from "@/lib/avatar";
import { hashPassword } from "@/lib/auth/password";
import { createId } from "@/lib/utils/ids";
import {
  createInviteToken,
  inviteUrl,
} from "@/lib/invites/createInvite";
import { sendEmail } from "@/lib/email/send";
import {
  inviteEmailHtml,
  inviteEmailText,
} from "@/lib/email/invite";
import {
  welcomeEmailHtml,
  welcomeEmailText,
} from "@/lib/email/welcome";

/**
 * GET /api/admin/users — list all users (admin-only).
 * POST /api/admin/users — create a user (admin-only), two ways:
 *   - with an initial password: the account exists immediately and the
 *     user gets a welcome email (the password is never emailed);
 *   - without a password: an invite email is sent instead, and the account
 *     is created when the invitee sets their own password.
 */

function requireAdmin(user: Awaited<ReturnType<typeof getCurrentUser>>) {
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

// Cached: the admin users list (photos included) is read on every /users
// visit and changes only through this file's POST and [id]'s DELETE — both
// revalidate the "users" tag. Auth runs per request outside the cached fn.
const getAdminUsers = unstable_cache(
  async () => {
    const rows = await sql`
      SELECT id, email, name, is_admin, created_at, avatar_hue, avatar_expression, photo_data_url
      FROM users ORDER BY created_at ASC
    `;

    return (
      rows as Array<{ id: string; email: string; name: string | null; is_admin: boolean; created_at: string; avatar_hue: number | null; avatar_expression: string | null; photo_data_url: string | null }>).map(
      (r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        isAdmin: r.is_admin,
        createdAt: r.created_at,
        avatar: avatarFromColumns(
          r.avatar_hue,
          r.avatar_expression,
          r.photo_data_url,
        ),
      }),
    );
  },
  ["admin-users"],
  { revalidate: 60, tags: ["users"] },
);

export async function GET() {
  const user = await getCurrentUser();
  const denied = requireAdmin(user);
  if (denied) return denied;

  return NextResponse.json(await getAdminUsers());
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const denied = requireAdmin(user);
  if (denied) return denied;
  if (!user) {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 403 },
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
    email.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "A name and an email address are required." },
      { status: 400 },
    );
  }

  // The initial password is optional. When omitted, the email carries a
  // setup link instead and the invitee chooses their own password — the
  // password itself is never transmitted by email.
  const hasPassword = typeof password === "string" && password.length > 0;
  if (hasPassword && password.length < 8) {
    return NextResponse.json(
      { error: "The initial password must be at least 8 characters — or leave it empty to email a setup link." },
      { status: 400 },
    );
  }

  const isAdmin = isAdminInput === true;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await sql`
    SELECT id FROM users WHERE email = ${normalizedEmail}
  `;
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "A user with that email already exists." },
      { status: 409 },
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  if (hasPassword) {
    const id = createId();
    const passwordHash = hashPassword(password);

    try {
      await sql`
        INSERT INTO users (id, name, email, password_hash, is_admin)
        VALUES (${id}, ${name.trim()}, ${normalizedEmail}, ${passwordHash}, ${isAdmin})
      `;
    } catch (error) {
      // Lost a race with a concurrent signup for the same email.
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

    const delivery = await sendEmail({
      to: normalizedEmail,
      subject: "Your ExaResume account is ready",
      html: welcomeEmailHtml({
        name: name.trim(),
        loginUrl: `${baseUrl}/login`,
      }),
      text: welcomeEmailText({
        name: name.trim(),
        loginUrl: `${baseUrl}/login`,
      }),
    });

    revalidateTag("users", { expire: 0 });

    return NextResponse.json(
      {
        id,
        name: name.trim(),
        email: normalizedEmail,
        isAdmin,
        invited: false,
        delivered: delivery.sent,
      },
      { status: 201 },
    );
  }

  // No initial password — email a setup link; the account is created when
  // the invitee sets their own password (same onboarding as email invites).
  const invite = await createInviteToken(normalizedEmail, user.id);
  const link = inviteUrl(invite.token);
  const delivery = await sendEmail({
    to: normalizedEmail,
    subject: "You've been invited to ExaResume",
    html: inviteEmailHtml({ inviteUrl: link }),
    text: inviteEmailText({ inviteUrl: link }),
  });

  return NextResponse.json(
    {
      id: invite.id,
      email: normalizedEmail,
      expiresAt: invite.expiresAt,
      invited: true,
      inviteUrl: link,
      delivered: delivery.sent,
      deliveryError: delivery.error ?? null,
    },
    { status: 201 },
  );
}
