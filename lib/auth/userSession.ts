import crypto from "node:crypto";

/**
 * Real user session (email+password login).
 *
 * The token is `userId.sessionVersion.expiresAt.hmac`. The version binds the
 * token to the user's `users.session_version` column: bumping that column
 * (password change, logout) invalidates every previously issued token for
 * the user, making sessions revocable rather than valid-until-expiry.
 * lib/auth's getCurrentUser compares the embedded version against the column
 * (proxy.ts only checks HMAC + expiry — the cheap redirect gate).
 */
export const USER_SESSION_COOKIE = "user_session";
export const USER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const USER_SESSION_REMEMBER_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set.");
  }
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createUserSessionToken(
  userId: string,
  sessionVersion: number,
  /**
   * Token lifetime in seconds. MUST match the cookie's maxAge: the cookie
   * can outlive a shorter token (silent logout while the cookie lingers), so
   * "Stay signed in" passes its 30-day window here, not just to the cookie.
   */
  maxAgeSeconds: number = USER_SESSION_MAX_AGE_SECONDS,
): string {
  const expiresAt = Date.now() + maxAgeSeconds * 1000;
  const payload = `${userId}.${sessionVersion}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

let lastToken: string | null = null;
let lastResult: {
  userId: string;
  sessionVersion: number;
  expiresAt: number;
} | null = null;

export function verifyUserSessionToken(
  token: string | undefined,
): { userId: string; sessionVersion: number } | null {
  if (!token) return null;

  // Return cached result if the same token was already verified on this
  // server instance (module state outlives a single request). The cached
  // expiry is re-checked: a token can expire while it's still the one being
  // verified over and over.
  if (lastToken === token && lastResult !== null) {
    if (Date.now() < lastResult.expiresAt) {
      return { userId: lastResult.userId, sessionVersion: lastResult.sessionVersion };
    }
    return null;
  }

  const [userId, version, expiresAt, signature] = token.split(".");
  if (!userId || !version || !expiresAt || !signature) return null;

  const payload = `${userId}.${version}.${expiresAt}`;
  const expected = sign(payload);
  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (signatureBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(signatureBuf, expectedBuf)) return null;
  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || Date.now() >= expiry) return null;

  const sessionVersion = Number.parseInt(version, 10);
  if (!Number.isFinite(sessionVersion)) return null;

  lastToken = token;
  lastResult = { userId, sessionVersion, expiresAt: expiry };
  return { userId, sessionVersion };
}
