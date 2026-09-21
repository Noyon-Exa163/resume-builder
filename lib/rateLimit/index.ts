import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";

export interface RateLimitRule {
  /** Namespaces the counter, e.g. "login-ip". */
  name: string;
  /** Requests allowed per window. */
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Roughly one call in this many also sweeps expired rows. */
const CLEANUP_ODDS = 50;

/**
 * Counts one request against `rule` for `identity` (fixed window, shared
 * across serverless instances through Postgres). Fails open: if the counter
 * can't be read or written, the request is allowed — a rate limiter outage
 * must never lock everyone out of login.
 */
export async function checkRateLimit(
  identity: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowIndex = Math.floor(nowSeconds / rule.windowSeconds);
  const windowEndSeconds = (windowIndex + 1) * rule.windowSeconds;
  const key = `${rule.name}:${identity}:${windowIndex}`;

  try {
    const rows = (await sql`
      INSERT INTO rate_limits (key, count, expires_at)
      VALUES (${key}, 1, to_timestamp(${windowEndSeconds}))
      ON CONFLICT (key) DO UPDATE SET count = rate_limits.count + 1
      RETURNING count
    `) as Array<{ count: number }>;

    if (Math.random() < 1 / CLEANUP_ODDS) {
      void sql`DELETE FROM rate_limits WHERE expires_at < now()`.catch(
        () => undefined,
      );
    }

    const count = rows[0]?.count ?? 1;
    return {
      allowed: count <= rule.limit,
      retryAfterSeconds: Math.max(1, windowEndSeconds - nowSeconds),
    };
  } catch (error) {
    console.error("Rate limit check failed; allowing request:", error);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

/** Standard 429 response with a Retry-After header and a readable message. */
export function rateLimitResponse(retryAfterSeconds: number) {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  const wait =
    retryAfterSeconds < 60
      ? `${retryAfterSeconds} seconds`
      : `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  return NextResponse.json(
    { error: `Too many requests. Please wait ${wait} and try again.` },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

/** Best-effort client IP behind Netlify or a generic proxy. */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-nf-client-connection-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export const LOGIN_IP_RULE: RateLimitRule = {
  name: "login-ip",
  limit: 50,
  windowSeconds: 15 * 60,
};

export const LOGIN_ACCOUNT_RULE: RateLimitRule = {
  name: "login-account",
  limit: 10,
  windowSeconds: 15 * 60,
};

export const AI_CHAT_RULE: RateLimitRule = {
  name: "ai-chat",
  limit: 60,
  windowSeconds: 5 * 60,
};

export const AI_PARSE_RULE: RateLimitRule = {
  name: "ai-parse",
  limit: 20,
  windowSeconds: 10 * 60,
};
