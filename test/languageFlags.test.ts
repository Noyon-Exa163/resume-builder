import { describe, expect, it } from "vitest";
import { resolveLanguageFlagSrc } from "@/templates/languageFlags";

describe("resolveLanguageFlagSrc", () => {
  it("resolves a common language name to its flag path", () => {
    expect(resolveLanguageFlagSrc("English")).toBe("/flags/language/en.svg");
    expect(resolveLanguageFlagSrc("French")).toBe("/flags/language/fr.svg");
    expect(resolveLanguageFlagSrc("Spanish")).toBe("/flags/language/es.svg");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(resolveLanguageFlagSrc("  GERMAN  ")).toBe("/flags/language/de.svg");
    expect(resolveLanguageFlagSrc("japanese")).toBe("/flags/language/ja.svg");
  });

  it("falls back to the generic flag for an unmapped name", () => {
    expect(resolveLanguageFlagSrc("Klingon")).toBe("/flags/language/xx.svg");
  });
});
