import { cache } from "react";
import { cookies } from "next/headers";
import { avatarFromColumns, type AvatarPreferences } from "@/lib/avatar";
import { sql } from "@/lib/db/client";
import { USER_SESSION_COOKIE, verifyUserSessionToken } from "./userSession";

export interface CurrentUser {
  id: string;
  email: string;
  /** Display name; falls back to the email's local part when unset. */
  name: string;
  role: "user" | "admin";
  avatar: AvatarPreferences;
  /** ISO timestamp the user account was created (users.created_at). */
  createdAt: string;
}

/**
 * Reads the real user session cookie (email+password login, Postgres-backed
 * — see db/migrations/0001_init.sql) and looks up the user. Returns null
 * when not logged in; call sites decide whether that means redirect-to-login
 * or a 401. Server-only (uses next/headers cookies()).
 *
 * Wrapped in React's cache() so every Server Component rendered for the
 * same request (e.g. a page's own admin gate plus AppShell's sidebar check)
 * shares one DB lookup instead of each re-querying — this is request-scoped
 * (Next's per-request cache context), never shared across users or requests.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const session = verifyUserSessionToken(store.get(USER_SESSION_COOKIE)?.value);
  if (!session) return null;

  const rows = await sql`
    SELECT id, email, name, is_admin, avatar_hue, avatar_expression, photo_data_url, session_version, created_at FROM users WHERE id = ${session.userId}
  `;
  const row = rows[0] as
    | {
        id: string;
        email: string;
        name: string | null;
        is_admin: boolean;
        avatar_hue: number | null;
        avatar_expression: string | null;
        photo_data_url: string | null;
        session_version: number;
        created_at: string | Date;
      }
    | undefined;
  if (!row) return null;

  // Revocation: a token issued before the user's session_version was bumped
  // (password change, logout) is no longer valid, even though its signature
  // and expiry are still fine.
  if (row.session_version !== session.sessionVersion) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name?.trim() || row.email.split("@")[0],
    role: row.is_admin ? "admin" : "user",
    avatar: avatarFromColumns(
      row.avatar_hue,
      row.avatar_expression,
      row.photo_data_url,
    ),
    createdAt: new Date(row.created_at).toISOString(),
  };
});
