import crypto from "node:crypto";

/**
 * Real user session (email+password login). Separate from
 * passphraseSession.ts, which remains a Settings-only admin gate until it's
 * retired in favor of `isAdmin` on the logged-in user.
 */
export const USER_SESSION_COOKIE = "user_session";
export const USER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

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

export function createUserSessionToken(userId: string): string {
  const expiresAt = Date.now() + USER_SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyUserSessionToken(
  token: string | undefined,
): { userId: string } | null {
  if (!token) return null;
  const [userId, expiresAt, signature] = token.split(".");
  if (!userId || !expiresAt || !signature) return null;

  const payload = `${userId}.${expiresAt}`;
  const expected = sign(payload);
  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (signatureBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(signatureBuf, expectedBuf)) return null;
  if (Date.now() >= Number(expiresAt)) return null;

  return { userId };
}
