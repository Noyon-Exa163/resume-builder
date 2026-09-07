import { describe, expect, it } from "vitest";
import { parseResumeHeuristically } from "@/lib/import/heuristicParser";

const PLAIN_TEXT_RESUME = `
Jane Doe
jane.doe@example.com
(555) 123-4567
linkedin.com/in/janedoe

EXPERIENCE
Software Engineer
Acme Corp
Jan 2020 - Present
- Built the thing
- Fixed the other thing

EDUCATION
B.S. Computer Science
State University
2016 - 2020

SKILLS
Languages: JavaScript, TypeScript, Python
`;

describe("parseResumeHeuristically (plain text)", () => {
  const draft = parseResumeHeuristically(PLAIN_TEXT_RESUME, "text");

  it("extracts personal info from the top of the document", () => {
    expect(draft.personalInfo?.fullName).toBe("Jane Doe");
    expect(draft.personalInfo?.email).toBe("jane.doe@example.com");
    expect(draft.personalInfo?.phone).toContain("123-4567");
    expect(draft.personalInfo?.linkedin).toContain("linkedin.com/in/janedoe");
  });

  it("recognizes an experience section with a dated, bulleted entry", () => {
    const section = draft.sections?.find((s) => s?.kind === "experience");
    expect(section).toBeDefined();
    expect(section?.layout).toBe("list");
    const entry = section?.entries?.[0];
    expect(entry?.title).toBe("Software Engineer");
    expect(entry?.subtitle).toBe("Acme Corp");
    expect(entry?.startDate).toContain("2020");
    expect(entry?.isCurrent).toBe(true);
    expect(entry?.bullets).toEqual([
      "Built the thing",
      "Fixed the other thing",
    ]);
  });

  it("recognizes an education section with a date range", () => {
    const section = draft.sections?.find((s) => s?.kind === "education");
    const entry = section?.entries?.[0];
    expect(entry?.title).toBe("B.S. Computer Science");
    expect(entry?.subtitle).toBe("State University");
    expect(entry?.startDate).toBe("2016");
    expect(entry?.endDate).toBe("2020");
  });

  it("recognizes a skills section as tags rather than bullets", () => {
    const section = draft.sections?.find((s) => s?.kind === "skills");
    expect(section?.layout).toBe("tags");
    expect(section?.entries?.[0]?.tags).toEqual([
      "JavaScript",
      "TypeScript",
      "Python",
    ]);
  });

  it("never drops unrecognized section headings", () => {
    const draft2 = parseResumeHeuristically(
      "Jane Doe\n\nHOBBIES\nRock climbing\nChess",
      "text",
    );
    const custom = draft2.sections?.find((s) => s?.title === "HOBBIES");
    expect(custom).toBeDefined();
    expect(custom?.kind).toBe("custom");
  });

  it("lays out a references section in two columns", () => {
    const draft2 = parseResumeHeuristically(
      "Jane Doe\n\nREFERENCES\nMatiur Rahman\nAssistant Manager",
      "text",
    );
    const section = draft2.sections?.find((s) => s?.title === "REFERENCES");
    expect(section?.kind).toBe("custom");
    expect(section?.layout).toBe("grid");
  });
});

describe("parseResumeHeuristically (docx html)", () => {
  const html = `
    <h1>John Smith</h1>
    <p>john@example.com</p>
    <h2>Experience</h2>
    <p><strong>Product Manager</strong></p>
    <p>Globex Inc</p>
    <p>2019 - 2021</p>
    <ul><li>Led the launch</li><li>Shipped the roadmap</li></ul>
  `;
  const draft = parseResumeHeuristically(html, "docx");

  it("treats <h1>/<h2> tags as headings regardless of casing", () => {
    expect(draft.personalInfo?.fullName).toBe("John Smith");
    const section = draft.sections?.find((s) => s?.kind === "experience");
    expect(section).toBeDefined();
  });

  it("does not treat a bold job title as its own section", () => {
    const section = draft.sections?.find((s) => s?.kind === "experience");
    expect(section?.entries).toHaveLength(1);
    expect(section?.entries?.[0]?.title).toBe("Product Manager");
  });

  it("recognizes <ul><li> items as bullets, not new entries", () => {
    const section = draft.sections?.find((s) => s?.kind === "experience");
    expect(section?.entries?.[0]?.bullets).toEqual([
      "Led the launch",
      "Shipped the roadmap",
    ]);
  });
});
