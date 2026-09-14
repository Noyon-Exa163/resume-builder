import { describe, expect, it } from "vitest";
import { truncateFilenameMiddle } from "@/lib/utils/truncateFilename";

describe("truncateFilenameMiddle", () => {
  it("leaves a name that already fits unchanged", () => {
    expect(truncateFilenameMiddle("resume.pdf", 30)).toBe("resume.pdf");
  });

  it("truncates the middle of the base name, keeping the extension", () => {
    const name =
      "My_Really_Long_Professional_Resume_Final_Version_2024.pdf";
    const result = truncateFilenameMiddle(name, 30);
    expect(result.length).toBeLessThanOrEqual(30);
    expect(result.endsWith(".pdf")).toBe(true);
    expect(result).toContain("…");
    expect(result.startsWith("My_Really")).toBe(true);
  });

  it("handles a name with no extension", () => {
    const result = truncateFilenameMiddle(
      "a_very_long_filename_with_no_extension_at_all",
      20,
    );
    expect(result.length).toBeLessThanOrEqual(20);
    expect(result).toContain("…");
  });

  it("does not treat a leading dot (dotfile) as an extension", () => {
    const result = truncateFilenameMiddle(
      ".a_very_long_hidden_file_name_indeed",
      20,
    );
    expect(result.length).toBeLessThanOrEqual(20);
    expect(result).toContain("…");
  });

  it("falls back to end truncation when maxLength is too small for the extension", () => {
    const result = truncateFilenameMiddle("resume.pdf", 3);
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result.endsWith("…")).toBe(true);
  });

  it("returns the name unchanged for a non-positive maxLength", () => {
    expect(truncateFilenameMiddle("resume.pdf", 0)).toBe("resume.pdf");
  });
});
