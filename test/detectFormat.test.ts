import { describe, expect, it } from "vitest";
import { detectFormat } from "@/lib/import/detectFormat";

const file = (name: string, type = "") => new File(["x"], name, { type });

describe("detectFormat", () => {
  it.each([
    ["cv.png", "image/png"],
    ["cv.jpg", "image/jpeg"],
    ["cv.jpeg", ""],
    ["cv.webp", "image/webp"],
    ["cv.avif", "image/avif"],
    ["CV.PNG", ""],
    ["scan.gif", "image/gif"],
    ["scan.bmp", ""],
  ])("treats %s as an image", (name, type) => {
    expect(detectFormat(file(name, type))).toBe("image");
  });

  it("keeps the existing formats", () => {
    expect(detectFormat(file("a.pdf", "application/pdf"))).toBe("pdf");
    expect(detectFormat(file("a.docx"))).toBe("docx");
    expect(detectFormat(file("a.md"))).toBe("markdown");
    expect(detectFormat(file("a.txt"))).toBe("text");
    expect(detectFormat(file("a.json"))).toBe("json");
    expect(detectFormat(file("a.zip"))).toBe("unknown");
  });
});
