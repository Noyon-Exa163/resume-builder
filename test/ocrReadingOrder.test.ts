import { describe, expect, it } from "vitest";
import { orderOcrBoxes } from "@/lib/import/extractors/ocrReadingOrder";

const box = (text: string, x0: number, y0: number, x1: number, y1: number) => ({
  text,
  x0,
  y0,
  x1,
  y1,
});

describe("orderOcrBoxes", () => {
  it("reads each column top to bottom instead of straight across", () => {
    const text = orderOcrBoxes([
      box("Main one", 0, 0, 400, 20),
      box("Side one", 500, 0, 700, 20),
      box("Main two", 0, 30, 400, 50),
      box("Side two", 500, 30, 700, 50),
    ]);
    expect(text).toBe("Main one\nMain two\nSide one\nSide two");
  });

  it("keeps a full-width header above the columns", () => {
    const text = orderOcrBoxes([
      box("Header", 0, 0, 700, 20),
      box("Side", 500, 80, 700, 100),
      box("Main", 0, 80, 400, 100),
    ]);
    expect(text).toBe("Header\nMain\nSide");
  });

  it("joins fragments on the same row left to right", () => {
    expect(
      orderOcrBoxes([box("world", 53, 0, 120, 20), box("hello", 0, 0, 50, 20)]),
    ).toBe("hello world");
  });

  it("returns an empty string when nothing was recognised", () => {
    expect(orderOcrBoxes([box("  ", 0, 0, 10, 10)])).toBe("");
  });
});
