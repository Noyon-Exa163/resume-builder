import { describe, expect, it } from "vitest";
import { resumeHasContent } from "@/lib/export/shared";
import { createBlankResume, normalizeAndValidate } from "@/lib/schema/normalize";

describe("resumeHasContent", () => {
  it("is false for a newly created resume", () => {
    expect(resumeHasContent(createBlankResume())).toBe(false);
  });

  it("ignores whitespace-only fields", () => {
    const resume = normalizeAndValidate({
      personalInfo: { fullName: "   " },
      summary: " ",
    });
    expect(resumeHasContent(resume)).toBe(false);
  });

  it("is true once any personal info is filled in", () => {
    const resume = normalizeAndValidate({
      personalInfo: { fullName: "", email: "ada@example.com" },
    });
    expect(resumeHasContent(resume)).toBe(true);
  });

  it("is true with only a summary", () => {
    const resume = normalizeAndValidate({ summary: "Pioneer of computing." });
    expect(resumeHasContent(resume)).toBe(true);
  });

  it("is true with only a section that has content", () => {
    const resume = normalizeAndValidate({
      sections: [
        {
          kind: "experience",
          title: "Experience",
          layout: "list",
          entries: [],
        },
      ],
    });
    expect(resumeHasContent(resume)).toBe(true);
  });
});
