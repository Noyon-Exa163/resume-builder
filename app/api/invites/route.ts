import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email/send";
import { inviteEmailHtml, inviteEmailText } from "@/lib/email/invite";
import { createInviteToken, inviteUrl } from "@/lib/invites/createInvite";

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

/** POST /api/invites — create an invite for an email address (admin-only). */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  const denied = requireAdmin(user);
  if (denied) return denied;
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, isAdmin } = body as {
    email?: unknown;
    isAdmin?: unknown;
  };

  if (typeof email !== "string" || email.trim().length === 0) {
    return NextResponse.json(
      { error: "A valid email address is required." },
      { status: 400 },
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return NextResponse.json(
      { error: "That doesn't look like a valid email address." },
      { status: 400 },
    );
  }

  // Only existing admins can invite someone as admin.
  const requestedIsAdmin = typeof isAdmin === "boolean" ? isAdmin : false;

  // Reject if the user already exists
  const existingUser = await sql`
    SELECT id FROM users WHERE email = ${normalizedEmail}
  `;
  if (existingUser.length > 0) {
    return NextResponse.json(
      { error: "A user with that email already exists." },
      { status: 409 },
    );
  }

  // Revoke any existing unexpired invite for this email, then create the
  // fresh token (shared with the admin-create flow).
  const invite = await createInviteToken(normalizedEmail, user.id, requestedIsAdmin);

  // Send the invite email
  const link = inviteUrl(invite.token);
  const delivery = await sendEmail({
    to: normalizedEmail,
    subject: "You've been invited to ExaResume",
    html: inviteEmailHtml({
      inviteUrl: link,
    }),
    text: inviteEmailText({
      inviteUrl: link,
    }),
  });

  // `inviteUrl` comes back even when delivery succeeded so the admin can
  // re-share the link if it lands in spam; `delivered` tells the UI whether
  // to present it as the primary path (email not configured / failed).
  return NextResponse.json({
    id: invite.id,
    email: normalizedEmail,
    isAdmin: invite.isAdmin,
    expiresAt: invite.expiresAt,
    inviteUrl: link,
    delivered: delivery.sent,
    deliveryError: delivery.error ?? null,
  }, { status: 201 });
}

/** GET /api/invites — list all invites (admin-only). */
export async function GET() {
  const user = await getCurrentUser();
  const denied = requireAdmin(user);
  if (denied) return denied;

  const rows = await sql`
    SELECT i.id, i.email, i.token, i.expires_at, i.used_at, i.created_at,
      COALESCE(u.name, u.email, 'an admin') AS invited_by
    FROM invite_tokens i
    LEFT JOIN users u ON u.id = i.invited_by
    ORDER BY i.created_at DESC
  `;

  return NextResponse.json(
    (rows as Array<{
      id: string;
      email: string;
      invited_by: string;
      token: string;
      expires_at: string;
      used_at: string | null;
      created_at: string;
    }>).map((r) => ({
      id: r.id,
      email: r.email,
      invitedBy: r.invited_by,
      token: r.token,
      expiresAt: r.expires_at,
      usedAt: r.used_at,
      createdAt: r.created_at,
    })),
  );
}
