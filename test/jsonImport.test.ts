import { describe, expect, it } from "vitest";
import { parseResumeJson } from "@/lib/import/jsonImport";
import { createBlankResume } from "@/lib/schema/normalize";

describe("parseResumeJson", () => {
  it("accepts a resume exported from the app", () => {
    const exported = JSON.stringify(createBlankResume(), null, 2);
    const result = parseResumeJson(exported);
    expect(result.ok).toBe(true);
  });

  it("accepts a partial resume that has personal info", () => {
    const result = parseResumeJson(
      JSON.stringify({ personalInfo: { fullName: "Ada Lovelace" } }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects text that is not JSON", () => {
    const result = parseResumeJson("not json {");
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toMatch(/isn't valid JSON/);
  });

  it.each([
    ["an array", "[1, 2, 3]"],
    ["a string", '"hello"'],
    ["null", "null"],
    ["unrelated JSON", '{"name": "package", "version": "1.0.0"}'],
    ["personalInfo that is not an object", '{"personalInfo": "Ada"}'],
    ["sections that is not a list", '{"personalInfo": {}, "sections": {}}'],
  ])("rejects %s", (_label, text) => {
    expect(parseResumeJson(text)).toMatchObject({ ok: false });
  });

  it("rejects an unknown schema version", () => {
    const result = parseResumeJson(
      JSON.stringify({ schemaVersion: 2, personalInfo: {} }),
    );
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toMatch(/different version/);
  });
});
