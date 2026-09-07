import { describe, expect, it } from "vitest";
import { toDocx } from "@/lib/export/toDocx";
import { toJsonBlob } from "@/lib/export/toJson";
import { normalizeAndValidate } from "@/lib/schema/normalize";

const resume = normalizeAndValidate({
  personalInfo: { fullName: "Ada Lovelace", email: "ada@example.com" },
  summary: "Pioneer of computing.",
  sections: [
    {
      kind: "experience",
      title: "Experience",
      entries: [{ title: "Analyst", bullets: ["Wrote the first published algorithm"] }],
    },
  ],
});

describe("toDocx", () => {
  it("produces a non-empty .docx blob", async () => {
    const blob = await toDocx(resume);
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
  });
});

describe("toJsonBlob", () => {
  it("round-trips back into a valid ResumeData", async () => {
    const blob = toJsonBlob(resume);
    expect(blob.type).toBe("application/json");
    const text = await blob.text();
    const parsed = normalizeAndValidate(JSON.parse(text));
    expect(parsed.personalInfo.fullName).toBe("Ada Lovelace");
    expect(parsed.sections[0].entries[0].title).toBe("Analyst");
  });
});
