import { describe, expect, it } from "vitest";
import { toMarkdown } from "@/lib/export/toMarkdown";
import { normalizeAndValidate } from "@/lib/schema/normalize";

const resume = normalizeAndValidate({
  personalInfo: {
    fullName: "Ada Lovelace",
    headline: "Mathematician",
    email: "ada@example.com",
  },
  summary: "Pioneer of computing.",
  sections: [
    {
      kind: "experience",
      title: "Experience",
      layout: "list",
      entries: [
        {
          title: "Analyst",
          subtitle: "Analytical Engine Co.",
          startDate: "1842",
          endDate: "1843",
          bullets: ["Wrote the first published algorithm"],
        },
      ],
    },
    {
      kind: "skills",
      title: "Skills",
      layout: "tags",
      entries: [{ title: "Languages", tags: ["Mathematics", "Programming"] }],
    },
  ],
});

describe("toMarkdown", () => {
  const markdown = toMarkdown(resume);

  it("renders the name as an H1 and contact info below it", () => {
    expect(markdown).toContain("# Ada Lovelace");
    expect(markdown).toContain("Mathematician");
    expect(markdown).toContain("ada@example.com");
  });

  it("renders the summary under its own heading", () => {
    expect(markdown).toContain("## Summary");
    expect(markdown).toContain("Pioneer of computing.");
  });

  it("renders a list-layout section with a title/subtitle line and bullets", () => {
    expect(markdown).toContain("## Experience");
    expect(markdown).toContain("**Analyst — Analytical Engine Co.**");
    expect(markdown).toContain("1842 – 1843");
    expect(markdown).toContain("- Wrote the first published algorithm");
  });

  it("renders a tags-layout section as a category line, not bullets", () => {
    expect(markdown).toContain("## Skills");
    expect(markdown).toContain("**Languages:** Mathematics, Programming");
  });

  it("omits sections and fields with no content", () => {
    const blank = normalizeAndValidate({ personalInfo: { fullName: "Empty" } });
    const rendered = toMarkdown(blank);
    expect(rendered).not.toContain("##");
  });
});
