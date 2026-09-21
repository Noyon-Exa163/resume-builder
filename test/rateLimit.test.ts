import { beforeEach, describe, expect, it, vi } from "vitest";

const { sqlMock } = vi.hoisted(() => ({ sqlMock: vi.fn() }));

vi.mock("@/lib/db/client", () => ({ sql: sqlMock }));

import {
  checkRateLimit,
  getClientIp,
  type RateLimitRule,
} from "@/lib/rateLimit";

const RULE: RateLimitRule = { name: "test", limit: 3, windowSeconds: 60 };

describe("checkRateLimit", () => {
  beforeEach(() => {
    sqlMock.mockReset();
    vi.spyOn(Math, "random").mockReturnValue(0.99); // skip the cleanup sweep
  });

  it("allows requests up to the limit and blocks the next one", async () => {
    sqlMock.mockResolvedValueOnce([{ count: 3 }]);
    expect((await checkRateLimit("user-1", RULE)).allowed).toBe(true);

    sqlMock.mockResolvedValueOnce([{ count: 4 }]);
    const blocked = await checkRateLimit("user-1", RULE);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("fails open when the counter cannot be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    sqlMock.mockRejectedValueOnce(new Error('relation "rate_limits" does not exist'));
    expect((await checkRateLimit("user-1", RULE)).allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("prefers the Netlify header, then the first forwarded address", () => {
    const netlify = new Request("http://x", {
      headers: { "x-nf-client-connection-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" },
    });
    expect(getClientIp(netlify)).toBe("1.1.1.1");

    const forwarded = new Request("http://x", {
      headers: { "x-forwarded-for": "2.2.2.2, 3.3.3.3" },
    });
    expect(getClientIp(forwarded)).toBe("2.2.2.2");

    expect(getClientIp(new Request("http://x"))).toBe("unknown");
  });
});
