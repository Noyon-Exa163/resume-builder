import { sql } from "@/lib/db/client";
import { createId } from "@/lib/utils/ids";
import { sendEmail } from "@/lib/email/send";

export const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export interface PasswordResetResult {
  ok: boolean;
  error?: string;
  resetUrl?: string;
  delivered?: boolean;
  deliveryError?: string | null;
}

/**
 * Creates (or replaces) a single-use password reset token for `email` and
 * sends a reset link. Never leaks whether the email exists — returns success
 * either way, and the email is only sent if a real account matches.
 */
export async function requestPasswordReset(email: string): Promise<PasswordResetResult> {
  const normalizedEmail = email.toLowerCase().trim();

  const rows = await sql`
    SELECT id FROM users WHERE email = ${normalizedEmail}
  `;
  const user = rows[0] as { id: string } | undefined;

  if (!user) {
    // Don't reveal whether the email exists.
    return { ok: true };
  }

  // Revoke any outstanding unexpired reset tokens for this user.
  await sql`
    DELETE FROM password_reset_tokens
    WHERE user_id = ${user.id} AND used_at IS NULL
  `;

  const id = createId();
  const token = createId();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS).toISOString();

  await sql`
    INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
    VALUES (${id}, ${user.id}, ${token}, ${expiresAt})
  `;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password/${token}`;

  const delivery = await sendEmail({
    to: normalizedEmail,
    subject: "Reset your ExaResume password",
    html: passwordResetEmailHtml({ resetUrl }),
    text: passwordResetEmailText({ resetUrl }),
  });

  return {
    ok: true,
    resetUrl,
    delivered: delivery.sent,
    deliveryError: delivery.error ?? null,
  };
}

/**
 * Validates a reset token and returns the user id if it's still valid
 * (not expired, not already used). Returns null otherwise.
 */
export interface ValidateTokenResult {
  valid: boolean;
  userId?: string;
  reason?: "not_found" | "already_used" | "expired";
}

export async function validateResetToken(token: string): Promise<ValidateTokenResult> {
  const rows = await sql`
    SELECT prt.user_id, prt.expires_at, prt.used_at, u.email
    FROM password_reset_tokens prt
    JOIN users u ON u.id = prt.user_id
    WHERE prt.token = ${token}
  `;
  const row = rows[0] as
    | { user_id: string; expires_at: string; used_at: string | null; email: string }
    | undefined;

  if (!row) return { valid: false, reason: "not_found" };
  if (row.used_at) return { valid: false, reason: "already_used" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { valid: false, reason: "expired" };
  return { valid: true, userId: row.user_id };
}

/**
 * Atomically consumes a still-valid reset token and sets the new password —
 * claim (used_at) + password update + stale-token cleanup run in one
 * transaction, and the claim only matches unexpired, unconsumed tokens, so a
 * token can never be applied twice even by concurrent submissions.
 * Returns false when the token was already used, expired, or unknown.
 */
export async function consumeResetTokenAndSetPassword(
  token: string,
  newPassword: string,
): Promise<boolean> {
  const { hashPassword } = await import("@/lib/auth/password");
  const passwordHash = hashPassword(newPassword);

  return sql.begin(async (tx) => {
    const claimed = (await tx`
      UPDATE password_reset_tokens
      SET used_at = now()
      WHERE token = ${token}
        AND used_at IS NULL
        AND expires_at > now()
      RETURNING user_id
    `) as Array<{ user_id: string }>;

    const userId = claimed[0]?.user_id;
    if (!userId) return false;

    await tx`
      UPDATE users
      SET password_hash = ${passwordHash},
          session_version = session_version + 1
      WHERE id = ${userId}
    `;

    // Any other outstanding tokens for this user are stale now.
    await tx`
      DELETE FROM password_reset_tokens
      WHERE user_id = ${userId} AND used_at IS NULL
    `;

    return true;
  });
}

function passwordResetEmailHtml({ resetUrl }: { resetUrl: string }): string {
  return `
<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1c283c; max-width: 600px; margin: 0 auto; padding: 40px 24px;">
    <div style="font-size: 32px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 32px;">
      <span style="color: #0072ED;">Exa</span><span style="color: #1c283c;">Resume</span>
    </div>
    <p style="font-size: 16px; margin-bottom: 16px;">Hi there,</p>
    <p style="font-size: 16px; margin-bottom: 16px;">You requested a password reset for your ExaResume account.</p>
    <p style="font-size: 16px; margin-bottom: 24px;">Click the button below to set a new password:</p>
    <p style="margin: 32px 0;">
      <a href="${resetUrl}" style="background: #0072ED; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; display: inline-block; font-size: 16px;">
        Reset Password
      </a>
    </p>
    <p style="font-size: 14px; color: #45556c; margin-top: 32px;">
      This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    </p>
  </body>
</html>
`;
}

function passwordResetEmailText({ resetUrl }: { resetUrl: string }): string {
  return `
ExaResume

Hi there,

You requested a password reset for your ExaResume account.

Click the link below to set a new password:
${resetUrl}

This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
`;
}
