import crypto from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createUserSessionToken,
  verifyUserSessionToken,
} from "@/lib/auth/userSession";
import { PROTECTED_ADMIN_EMAIL } from "@/lib/auth/constants";
import { canManageAllResumes, resolveResumeAccess } from "@/lib/auth/permissions";

const TEST_SECRET = "test-session-secret-for-auth-unit-tests";

beforeAll(() => {
  process.env.SESSION_SECRET = TEST_SECRET;
});

describe("hashPassword / verifyPassword", () => {
  it("roundtrips: a hash verifies against the original password", () => {
    const stored = hashPassword("correct horse battery staple");
    expect(verifyPassword("correct horse battery staple", stored)).toBe(true);
  });

  it("rejects the wrong password", () => {
    const stored = hashPassword("correct horse battery staple");
    expect(verifyPassword("wrong password", stored)).toBe(false);
  });

  it("produces different hashes for the same password (random salt)", () => {
    const password = "same-password-twice";
    const first = hashPassword(password);
    const second = hashPassword(password);
    expect(first).not.toBe(second);
    expect(verifyPassword(password, first)).toBe(true);
    expect(verifyPassword(password, second)).toBe(true);
  });
});

describe("createUserSessionToken / verifyUserSessionToken", () => {
  it("verifies a freshly created token and returns the userId and version", () => {
    const token = createUserSessionToken("user_abc123", 2);
    expect(verifyUserSessionToken(token)).toEqual({
      userId: "user_abc123",
      sessionVersion: 2,
    });
  });

  it("rejects a token whose signature has been tampered with", () => {
    const token = createUserSessionToken("user_abc123", 0);
    const lastDot = token.lastIndexOf(".");
    const payload = token.slice(0, lastDot);
    const signature = token.slice(lastDot + 1);
    const flipped = (signature[0] === "a" ? "b" : "a") + signature.slice(1);
    expect(verifyUserSessionToken(`${payload}.${flipped}`)).toBeNull();
  });

  it("rejects an expired token", () => {
    // Mirrors createUserSessionToken's `userId.version.expiresAt.hmac` layout
    // so we can pin expiry in the past without waiting on the 7-day max-age.
    const userId = "user_abc123";
    const expiresAt = Date.now() - 1_000;
    const payload = `${userId}.0.${expiresAt}`;
    const signature = crypto
      .createHmac("sha256", TEST_SECRET)
      .update(payload)
      .digest("hex");
    expect(verifyUserSessionToken(`${payload}.${signature}`)).toBeNull();
  });

  it("rejects a legacy pre-version token", () => {
    // Tokens issued before session revocation had no version segment — they
    // must not verify, or old (possibly stolen) cookies would keep working.
    const userId = "user_abc123";
    const expiresAt = Date.now() + 60_000;
    const payload = `${userId}.${expiresAt}`;
    const signature = crypto
      .createHmac("sha256", TEST_SECRET)
      .update(payload)
      .digest("hex");
    expect(verifyUserSessionToken(`${payload}.${signature}`)).toBeNull();
  });

  it("carries different versions for the same user", () => {
    // getCurrentUser compares the embedded version against
    // users.session_version — different versions must never collide.
    const before = createUserSessionToken("user_abc123", 4);
    const after = createUserSessionToken("user_abc123", 5);
    expect(verifyUserSessionToken(before)?.sessionVersion).toBe(4);
    expect(verifyUserSessionToken(after)?.sessionVersion).toBe(5);
    expect(before).not.toBe(after);
  });
});

describe("resume visibility", () => {
  it("grants org-wide full access to the protected Super Admin only", () => {
    expect(canManageAllResumes(PROTECTED_ADMIN_EMAIL)).toBe(true);
    expect(canManageAllResumes("Khalid.Hasan@exabyting.com")).toBe(true);
    expect(canManageAllResumes("other.admin@exabyting.com")).toBe(false);

    expect(
      resolveResumeAccess({
        userId: "admin-1",
        userEmail: PROTECTED_ADMIN_EMAIL,
        ownerId: "admin-1",
        sharePermission: null,
      }),
    ).toBe("owner");

    expect(
      resolveResumeAccess({
        userId: "admin-1",
        userEmail: PROTECTED_ADMIN_EMAIL,
        ownerId: "someone-else",
        sharePermission: null,
      }),
    ).toBe("admin");

    expect(
      resolveResumeAccess({
        userId: "admin-1",
        userEmail: PROTECTED_ADMIN_EMAIL,
        ownerId: "someone-else",
        sharePermission: "viewer",
      }),
    ).toBe("admin");

    expect(
      resolveResumeAccess({
        userId: "user-1",
        userEmail: "member@exabyting.com",
        ownerId: "someone-else",
        sharePermission: null,
      }),
    ).toBeNull();
  });
});
