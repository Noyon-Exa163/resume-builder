import { describe, expect, it } from "vitest";

import { formatLastSavedLabel } from "@/lib/utils/formatLastSaved";

const NOW = new Date("2026-09-07T12:00:00.000Z");

describe("formatLastSavedLabel", () => {
  it("says just now for saves under a minute old", () => {
    expect(
      formatLastSavedLabel("2026-09-07T11:59:30.000Z", NOW),
    ).toBe("Saved just now");
  });

  it("uses a relative phrase within the same day", () => {
    expect(
      formatLastSavedLabel("2026-09-07T11:45:00.000Z", NOW),
    ).toBe("Saved 15 minutes ago");
  });

  it("uses a calendar date after a day", () => {
    expect(
      formatLastSavedLabel("2026-09-01T12:00:00.000Z", NOW),
    ).toBe("Saved 01 Sep 2026");
  });
});
