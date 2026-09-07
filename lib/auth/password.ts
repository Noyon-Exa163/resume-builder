import crypto from "node:crypto";

const KEY_LENGTH = 64;

/**
 * scrypt-based password hashing (Node's built-in crypto — no new dependency
 * needed, per this project's "no vendor SDK unless necessary" convention).
 * Stored as "salt:hash", both hex-encoded.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const candidate = crypto.scryptSync(password, salt, KEY_LENGTH);
  const storedBuf = Buffer.from(hash, "hex");
  if (candidate.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(candidate, storedBuf);
}
