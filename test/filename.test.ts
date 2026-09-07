import { describe, expect, it } from "vitest";
import { buildExportFilename } from "@/lib/export/filename";
import { normalizeAndValidate } from "@/lib/schema/normalize";

describe("buildExportFilename", () => {
  it("title-cases the person's name and joins it with dashes", () => {
    const resume = normalizeAndValidate({
      personalInfo: { fullName: "ada lovelace" },
    });
    expect(buildExportFilename(resume)).toBe("Exabyting-Ada-Lovelace-Resume");
  });

  it("normalizes an already-uppercase or mixed-case name", () => {
    const resume = normalizeAndValidate({
      personalInfo: { fullName: "JOHN mcDONALD" },
    });
    expect(buildExportFilename(resume)).toBe("Exabyting-John-Mcdonald-Resume");
  });

  it("collapses multiple spaces into single dashes", () => {
    const resume = normalizeAndValidate({
      personalInfo: { fullName: "Ada   Lovelace" },
    });
    expect(buildExportFilename(resume)).toBe("Exabyting-Ada-Lovelace-Resume");
  });

  it("strips characters that are invalid in filenames", () => {
    const resume = normalizeAndValidate({
      personalInfo: { fullName: 'Ada "Lovelace"' },
    });
    expect(buildExportFilename(resume)).toBe("Exabyting-Ada-Lovelace-Resume");
  });

  it("falls back to the resume title when there's no name", () => {
    const resume = normalizeAndValidate({
      meta: { title: "Backend Engineer Draft" },
    });
    expect(buildExportFilename(resume)).toBe(
      "Exabyting-Backend-Engineer-Draft-Resume",
    );
  });

  it("falls back to a plain Resume name when nothing is set", () => {
    const resume = normalizeAndValidate({ meta: { title: "" } });
    expect(buildExportFilename(resume)).toBe("Exabyting-Resume-Resume");
  });
});
