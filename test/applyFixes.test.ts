import { describe, expect, it } from "vitest";
import { applyIssueFixes } from "@/lib/import/applyFixes";
import type { ImportIssue, ImportIssueFix } from "@/lib/import/errorFlagging";

function mkIssue(
  id: string,
  field: string,
  fix?: ImportIssueFix,
): ImportIssue {
  return {
    id,
    field,
    fix,
    message: id,
    severity: "warning",
    currentValue: null,
  };
}

interface FixtureSection {
  id: string;
  title: string;
  entries: Array<Record<string, unknown>>;
}

function buildFixture(): Record<string, unknown> {
  return {
    personalInfo: { fullName: "Ada", email: "broken" },
    sections: [
      { id: "s0", title: "Empty", entries: [] },
      { id: "s1", title: "Experience", entries: [{ id: "e1", title: "Role" }] },
      {
        id: "s2",
        title: "Wrong",
        entries: [
          { id: "e2", title: "Role", endDate: "Dec 2024", isCurrent: true },
          { id: "e3", title: "", bullets: [], tags: [] },
        ],
      },
    ],
  };
}

describe("applyIssueFixes", () => {
  it("sets a scalar value at a dot-path", () => {
    const data = buildFixture();
    const result = applyIssueFixes(data, [mkIssue("a", "personalInfo.email", { action: "set", value: "ada@example.com" })], ["a"]);
    expect((result.personalInfo as Record<string, unknown>).email).toBe("ada@example.com");
    expect((result.personalInfo as Record<string, unknown>).fullName).toBe("Ada");
  });

  it("removes a key from an object", () => {
    const data = buildFixture();
    const result = applyIssueFixes(
      data,
      [mkIssue("a", "sections[2].entries[0].endDate", { action: "remove" })],
      ["a"],
    );
    const entry = (result.sections as FixtureSection[])[2].entries[0];
    expect("endDate" in entry).toBe(false);
    expect(entry.isCurrent).toBe(true);
  });

  it("removes an array element by original index", () => {
    const data = buildFixture();
    const result = applyIssueFixes(
      data,
      [mkIssue("a", "sections[0]", { action: "remove" })],
      ["a"],
    );
    const sections = result.sections as FixtureSection[];
    expect(sections).toHaveLength(2);
    expect(sections.map((s) => s.id)).toEqual(["s1", "s2"]);
  });

  it("removes an entry nested in a section", () => {
    const data = buildFixture();
    const result = applyIssueFixes(
      data,
      [mkIssue("a", "sections[2].entries[1]", { action: "remove" })],
      ["a"],
    );
    const entries = (result.sections as FixtureSection[])[2].entries;
    expect(entries.map((e) => e.id)).toEqual(["e2"]);
  });

  it("honours original indices when sets and removals combine", () => {
    const data = buildFixture();
    const result = applyIssueFixes(
      data,
      [
        // Remove the first section, then retitle the one that WAS at index 2.
        mkIssue("rm", "sections[0]", { action: "remove" }),
        mkIssue("set", "sections[2].title", { action: "set", value: "Projects" }),
      ],
      ["rm", "set"],
    );
    const sections = result.sections as FixtureSection[];
    expect(sections).toHaveLength(2);
    expect(sections.find((s) => s.id === "s2")?.title).toBe("Projects");
    expect(sections.find((s) => s.id === "s1")?.title).toBe("Experience");
  });

  it("applies only the issues the user fixed", () => {
    const data = buildFixture();
    const result = applyIssueFixes(
      data,
      [
        mkIssue("a", "personalInfo.email", { action: "set", value: "ada@example.com" }),
        mkIssue("b", "sections[0]", { action: "remove" }),
      ],
      ["a"],
    );
    expect((result.personalInfo as Record<string, unknown>).email).toBe("ada@example.com");
    expect(result.sections).toHaveLength(3);
  });

  it("ignores issues without a fix payload", () => {
    const data = buildFixture();
    const result = applyIssueFixes(
      data,
      [mkIssue("a", "personalInfo.email")],
      ["a"],
    );
    expect(result).toBe(data);
  });

  it("writes a set onto a key the extraction never emitted", () => {
    const data = { personalInfo: { fullName: "Ada" } };
    const result = applyIssueFixes(
      data,
      [mkIssue("a", "personalInfo.headline", { action: "set", value: "Engineer" })],
      ["a"],
    );
    expect((result.personalInfo as Record<string, unknown>).headline).toBe("Engineer");
    expect((result.personalInfo as Record<string, unknown>).fullName).toBe("Ada");
  });

  it("does not mutate its input", () => {
    const data = buildFixture();
    const snapshot = structuredClone(data);
    applyIssueFixes(
      data,
      [
        mkIssue("a", "personalInfo.email", { action: "set", value: "ada@example.com" }),
        mkIssue("b", "sections[0]", { action: "remove" }),
        mkIssue("c", "sections[2].entries[0].endDate", { action: "remove" }),
      ],
      ["a", "b", "c"],
    );
    expect(data).toEqual(snapshot);
  });
});
