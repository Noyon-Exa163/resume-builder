import { cache } from "react";
import { cookies } from "next/headers";
import { sql } from "@/lib/db/client";
import { USER_SESSION_COOKIE, verifyUserSessionToken } from "./userSession";

export interface CurrentUser {
  id: string;
  email: string;
  role: "user" | "admin";
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
    SELECT id, email, is_admin FROM users WHERE id = ${session.userId}
  `;
  const row = rows[0] as
    | { id: string; email: string; is_admin: boolean }
    | undefined;
  if (!row) return null;

  return { id: row.id, email: row.email, role: row.is_admin ? "admin" : "user" };
});
