import { describe, expect, it } from "vitest";
import { normalizeHeadline } from "@/lib/schema/headline";
import { normalizeAndValidate } from "@/lib/schema/normalize";

describe("normalizeHeadline", () => {
  it("replaces pipe separators with a spaced bullet", () => {
    expect(
      normalizeHeadline(
        "DevOps Engineer | Cloud Infrastructure | Platform Automation",
      ),
    ).toBe(
      "DevOps Engineer • Cloud Infrastructure • Platform Automation",
    );
  });

  it("accepts pipes without surrounding spaces", () => {
    expect(normalizeHeadline("Engineer|Cloud")).toBe("Engineer • Cloud");
  });

  it("leaves an already-bulleted headline unchanged", () => {
    expect(normalizeHeadline("Engineer • Cloud")).toBe("Engineer • Cloud");
  });
});

describe("normalizeAndValidate headline", () => {
  it("persists bullets instead of bars from imported personalInfo", () => {
    const resume = normalizeAndValidate({
      personalInfo: {
        fullName: "Ada Lovelace",
        headline: "Mathematician | Analyst",
      },
    });
    expect(resume.personalInfo.headline).toBe("Mathematician • Analyst");
  });
});
