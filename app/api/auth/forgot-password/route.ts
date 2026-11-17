import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/auth/passwordReset";

/**
 * POST /api/auth/forgot-password
 * Body: { email: string }
 *
 * Creates a password reset token and emails a reset link. Always returns 200
 * (never leaks whether the email exists).
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

  const { email } = body as { email?: unknown };

  if (typeof email !== "string" || email.trim().length === 0) {
    return NextResponse.json(
      { error: "An email address is required." },
      { status: 400 },
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json(
      { error: "That doesn't look like a valid email address." },
      { status: 400 },
    );
  }

  await requestPasswordReset(email.trim());

  return NextResponse.json({
    ok: true,
    message: "If an account exists for that email, a reset link has been sent.",
  });
}
