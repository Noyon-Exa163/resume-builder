import { NextResponse } from "next/server";
import {
  validateResetToken,
  markResetTokenUsed,
  resetUserPassword,
} from "@/lib/auth/passwordReset";

/**
 * GET /api/auth/reset-password/[token]
 * Validates the token without consuming it — used by the reset page to
 * show the form only when the link is still valid.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const validation = await validateResetToken(token);
  return NextResponse.json({
    valid: validation.valid,
    reason: validation.reason ?? null,
  });
}

/**
 * POST /api/auth/reset-password/[token]
 * Body: { password: string }
 *
 * Validates the single-use reset token, sets the new password, and
 * invalidates all existing sessions for the user. Returns 200 on success.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { password } = body as { password?: string };

  if (
    typeof password !== "string" ||
    password.length < 8
  ) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const validation = await validateResetToken(token);
  if (!validation.valid) {
    let message = "This reset link is invalid or has expired.";
    if (validation.reason === "already_used") {
      message = "This reset link has already been used. Request a new one.";
    } else if (validation.reason === "expired") {
      message = "This reset link has expired. Request a new one.";
    }
    return NextResponse.json(
      { error: message },
      { status: 400 },
    );
  }

  await markResetTokenUsed(token);
  await resetUserPassword(validation.userId!, password);

  return NextResponse.json({ ok: true });
}
