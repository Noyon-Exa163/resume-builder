import { describe, expect, it } from "vitest";
import { flagImportIssues } from "@/lib/import/errorFlagging";
import type { DeepPartial } from "@/lib/schema/normalize";
import type { ResumeData as ResumeDataType } from "@/lib/schema/resume";

function buildResume(overrides: DeepPartial<ResumeDataType> = {}): DeepPartial<ResumeDataType> {
  return {
    personalInfo: {
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+880 1711 000000",
    },
    sections: [
      {
        id: "s1",
        kind: "experience",
        title: "Experience",
        entries: [
          {
            id: "e1",
            title: "Engineer",
            startDate: "Jan 2020",
            endDate: "Dec 2024",
            bullets: ["Built things."],
          },
        ],
      },
    ],
    ...overrides,
  };
}

function issueIds(issues: ReturnType<typeof flagImportIssues>): string[] {
  return issues.map((issue) => issue.id);
}

describe("flagImportIssues", () => {
  it("reports nothing for a complete resume", () => {
    expect(flagImportIssues(buildResume())).toEqual([]);
  });

  it("errors on a missing name without a one-click fix", () => {
    const issues = flagImportIssues(
      buildResume({ personalInfo: { fullName: "" } }),
    );
    const issue = issues.find((i) => i.id === "missing-full-name");
    expect(issue?.severity).toBe("error");
    expect(issue?.fix).toBeUndefined();
  });

  it("offers an email cleanup fix for a pasted-with-frills address", () => {
    const issues = flagImportIssues(
      buildResume({ personalInfo: { email: "<ada@example.com>," } }),
    );
    const issue = issues.find((i) => i.id === "invalid-email");
    expect(issue?.severity).toBe("error");
    expect(issue?.fix).toEqual({ action: "set", value: "ada@example.com" });
  });

  it("does not guess an email repair when none is obvious", () => {
    const issues = flagImportIssues(
      buildResume({ personalInfo: { email: "ada@example" } }),
    );
    const issue = issues.find((i) => i.id === "invalid-email");
    expect(issue?.fix).toBeUndefined();
  });

  it("warns when no email was found", () => {
    const issues = flagImportIssues(
      buildResume({ personalInfo: { email: undefined } }),
    );
    expect(issueIds(issues)).toContain("missing-email");
  });

  it("warns on a too-short phone number", () => {
    const issues = flagImportIssues(
      buildResume({ personalInfo: { phone: "123" } }),
    );
    expect(issueIds(issues)).toContain("invalid-phone");
  });

  it("errors when the end date precedes the start date", () => {
    const issues = flagImportIssues(
      buildResume({
        sections: [
          {
            id: "s1",
            kind: "experience",
            title: "Experience",
            entries: [
              {
                id: "e1",
                title: "Engineer",
                startDate: "Jan 2020",
                endDate: "Jan 2019",
                bullets: [],
              },
            ],
          },
        ],
      }),
    );
    const issue = issues.find((i) => i.id === "date-range-reversed-0-0");
    expect(issue?.severity).toBe("error");
  });

  it("flags current roles with an end date and offers to remove it", () => {
    const issues = flagImportIssues(
      buildResume({
        sections: [
          {
            id: "s1",
            kind: "experience",
            title: "Experience",
            entries: [
              {
                id: "e1",
                title: "Engineer",
                startDate: "Jan 2020",
                endDate: "Dec 2024",
                isCurrent: true,
                bullets: [],
              },
            ],
          },
        ],
      }),
    );
    const issue = issues.find((i) => i.id === "current-with-end-date-0-0");
    expect(issue?.fix).toEqual({ action: "remove" });
  });

  it("proposes a kind-based title for an untitled section", () => {
    const issues = flagImportIssues(
      buildResume({
        sections: [
          {
            id: "s1",
            kind: "education",
            title: "",
            entries: [{ id: "e1", title: "BSc", bullets: [] }],
          },
        ],
      }),
    );
    const issue = issues.find((i) => i.id === "empty-section-title-0");
    expect(issue?.fix).toEqual({ action: "set", value: "Education" });
  });

  it("renames the second of two identically titled sections", () => {
    const section = {
      id: "s1",
      kind: "custom" as const,
      title: "Projects",
      entries: [{ id: "e1", title: "Thing", bullets: [] }],
    };
    const issues = flagImportIssues(
      buildResume({ sections: [section, { ...section, id: "s2" }] }),
    );
    const issue = issues.find((i) => i.id === "duplicate-section-title-1");
    expect(issue?.fix).toEqual({ action: "set", value: "Projects (2)" });
  });

  it("offers to remove an empty section and an anonymous entry", () => {
    const issues = flagImportIssues(
      buildResume({
        sections: [
          { id: "s1", kind: "custom", title: "Empty", entries: [] },
          {
            id: "s2",
            kind: "experience",
            title: "Experience",
            entries: [{ id: "e1", bullets: [], tags: [] }],
          },
        ],
      }),
    );
    const emptySection = issues.find((i) => i.id === "empty-section-0");
    expect(emptySection?.fix).toEqual({ action: "remove" });
    expect(emptySection?.field).toBe("sections[0]");
    const emptyEntry = issues.find((i) => i.id === "empty-entry-1-0");
    expect(emptyEntry?.fix).toEqual({ action: "remove" });
    expect(emptyEntry?.field).toBe("sections[1].entries[0]");
  });

  it("escalates to a blocking error when nothing was extracted", () => {
    const issues = flagImportIssues(
      buildResume({
        sections: [{ id: "s1", kind: "custom", title: "Empty", entries: [] }],
      }),
    );
    expect(issues[0]?.id).toBe("all-sections-empty");
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.fix).toBeUndefined();
  });

  it("asks for dates on experience entries that have none", () => {
    const issues = flagImportIssues(
      buildResume({
        sections: [
          {
            id: "s1",
            kind: "experience",
            title: "Experience",
            entries: [{ id: "e1", title: "Engineer", bullets: ["Did work."] }],
          },
        ],
      }),
    );
    const issue = issues.find((i) => i.id === "no-dates-0-0");
    expect(issue?.severity).toBe("info");
    expect(issue?.fix).toBeUndefined();
  });
});
