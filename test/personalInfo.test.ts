import { describe, expect, it } from "vitest";
import { formatFullNameForDisplay, toTitleCase } from "@/lib/schema/personalInfo";

describe("formatFullNameForDisplay", () => {
  it("uppercases the name for the 'uppercase' casing, regardless of input casing", () => {
    expect(formatFullNameForDisplay("Ada Lovelace", "uppercase")).toBe(
      "ADA LOVELACE",
    );
    expect(formatFullNameForDisplay("ada lovelace", "uppercase")).toBe(
      "ADA LOVELACE",
    );
    expect(formatFullNameForDisplay("aDa LoVeLaCe", "uppercase")).toBe(
      "ADA LOVELACE",
    );
  });

  it("title-cases the name for the 'titleCase' casing, regardless of input casing", () => {
    expect(formatFullNameForDisplay("ADA LOVELACE", "titleCase")).toBe(
      "Ada Lovelace",
    );
    expect(formatFullNameForDisplay("ada lovelace", "titleCase")).toBe(
      "Ada Lovelace",
    );
    expect(formatFullNameForDisplay("aDa LoVeLaCe", "titleCase")).toBe(
      "Ada Lovelace",
    );
  });
});

describe("toTitleCase", () => {
  it("capitalizes each word and lowercases the rest", () => {
    expect(toTitleCase("JOHN VON NEUMANN")).toBe("John Von Neumann");
  });

  it("collapses repeated whitespace between words", () => {
    expect(toTitleCase("ada   lovelace")).toBe("Ada Lovelace");
  });
});
