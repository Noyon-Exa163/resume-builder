import { ADMIN_SESSION_COOKIE, verifySessionToken } from "./passphraseSession";

/**
 * True if the request carries a valid admin passphrase session. This is the
 * one place that decides admin access today — replace its implementation
 * (not its call sites) when real OAuth+role checks land.
 */
export function isAdminRequest(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie") ?? "";
  return verifySessionToken(parseCookie(cookieHeader, ADMIN_SESSION_COOKIE));
}

function parseCookie(cookieHeader: string, name: string): string | undefined {
  const prefix = `${name}=`;
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return match?.slice(prefix.length);
}
