import { sql } from "@/lib/db/client";
import { createId } from "@/lib/utils/ids";

/**
 * Shared invite-token creation for both entry points — "Invite by Email"
 * (standalone) and "New User" without an initial password. Revokes any
 * outstanding invite for the email first, so exactly one live link exists.
 */
export const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface CreatedInvite {
  id: string;
  token: string;
  expiresAt: string;
}

export async function createInviteToken(
  email: string,
  invitedByUserId: string,
): Promise<CreatedInvite> {
  await sql`
    DELETE FROM invite_tokens
    WHERE email = ${email} AND used_at IS NULL
  `;

  const id = createId();
  const token = createId();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS).toISOString();

  await sql`
    INSERT INTO invite_tokens (id, email, invited_by, token, expires_at)
    VALUES (${id}, ${email}, ${invitedByUserId}, ${token}, ${expiresAt})
  `;

  return { id, token, expiresAt };
}

export function inviteUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  return `${baseUrl}/invite/${token}`;
}
