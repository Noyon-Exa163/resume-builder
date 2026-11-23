import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "@/lib/date/relativeTime";

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-11-23T12:00:00Z");

  it("says Just now under a minute", () => {
    expect(formatRelativeTime("2026-11-23T11:59:30Z", now)).toBe("Just now");
  });

  it("formats minutes, hours and days", () => {
    expect(formatRelativeTime("2026-11-23T11:45:00Z", now)).toBe("15m ago");
    expect(formatRelativeTime("2026-11-23T09:00:00Z", now)).toBe("3h ago");
    expect(formatRelativeTime("2026-11-21T12:00:00Z", now)).toBe("2d ago");
    expect(formatRelativeTime("2026-11-10T12:00:00Z", now)).toBe("13d ago");
  });

  it("falls back to the display date after a month", () => {
    expect(formatRelativeTime("2026-10-10T12:00:00Z", now)).toBe(
      "10 Oct 2026",
    );
  });

  it("returns an empty string for unparseable or missing values", () => {
    expect(formatRelativeTime(null, now)).toBe("");
    expect(formatRelativeTime("not a date", now)).toBe("");
  });
});
