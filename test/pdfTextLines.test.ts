import { describe, expect, it } from "vitest";
import { buildTextLines } from "@/components/editor/PdfCanvasViewer";

/** Builds a pdfjs-style text item. Baselines are y-up (bigger = higher). */
function run(
  str: string,
  x: number,
  baselineY: number,
  width = str.length * 5,
  height = 12,
) {
  return { str, width, height, transform: [1, 0, 0, 1, x, baselineY] };
}

describe("buildTextLines", () => {
  it("groups fragments of one visual line into a single overlay", () => {
    // A styled run split: "Senior" bold + "Engineer" regular on one baseline.
    const lines = buildTextLines([
      run("Senior", 72, 700),
      run("Engineer", 120, 700),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe("Senior Engineer");
    expect(lines[0].x).toBe(72);
    expect(lines[0].right).toBe(120 + "Engineer".length * 5);
  });

  it("joins kerning-split fragments of the same word without a space", () => {
    // Tight gap (<= 15% of glyph height) is a continuation, not a word break.
    const lines = buildTextLines([
      run("Exa", 100, 700, 15),
      run("byting", 116, 700, 18),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe("Exabyting");
  });

  it("keeps separate baselines as separate lines", () => {
    const lines = buildTextLines([
      run("First line", 72, 700),
      run("Second line", 72, 682),
    ]);
    expect(lines.map((l) => l.text)).toEqual(["First line", "Second line"]);
  });

  it("separates a wrapped paragraph into per-line hits", () => {
    // One long bullet rendered as three line boxes — each line stays its own
    // hit so findFieldByText can substring-match back to the whole bullet.
    const lines = buildTextLines([
      run("Led the platform team through two", 72, 700),
      run("reorgs while shipping the export", 72, 682),
      run("pipeline on schedule.", 72, 664),
    ]);
    expect(lines).toHaveLength(3);
    expect(lines[0].text).toContain("Led the platform team");
  });

  it("sorts top-down regardless of input order", () => {
    const lines = buildTextLines([
      run("Lower", 72, 600),
      run("Higher", 72, 700),
    ]);
    expect(lines[0].text).toBe("Higher");
  });

  it("ignores marked-content wrappers and whitespace-only items", () => {
    const lines = buildTextLines([
      { type: "beginMarkedContent", id: "mc0" },
      run("Visible", 72, 700),
      { type: "endMarkedContent" },
      run("   ", 200, 700),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe("Visible");
  });

  it("returns no lines for an empty page", () => {
    expect(buildTextLines([])).toEqual([]);
  });

  it("keeps items of very different sizes on their own lines", () => {
    // A large display name and a small contact line sharing a rough baseline
    // region must not merge — the tolerance is relative to glyph height.
    const lines = buildTextLines([
      run("ADA LOVELACE", 72, 700, 200, 28),
      run("ada@example.com", 72, 686, 100, 10),
    ]);
    expect(lines).toHaveLength(2);
  });

  it("clamps hit boxes so adjacent lines never overlap", () => {
    // A 28pt display name directly above a 10pt contact line: the name's
    // box must be trimmed so it cannot reach down over the smaller line's
    // click area — otherwise hovering/clicking the email would light up
    // (and could open) the name's editor.
    const lines = buildTextLines([
      run("ADA LOVELACE", 72, 700, 200, 28),
      run("ada@example.com", 72, 686, 100, 10),
      run("+880 1711 000 111", 72, 672, 90, 10),
    ]);
    // y-up: a visually-lower line has a smaller baseline. x-ranges
    // intersect, so each line's band top must not rise above the line
    // above's band bottom — the bands must never intersect.
    for (let i = 1; i < lines.length; i += 1) {
      expect(lines[i].boxTop).toBeLessThanOrEqual(lines[i - 1].boxBottom);
    }
    // Each band stays positive-height and contains its own baseline.
    for (const line of lines) {
      expect(line.boxTop).toBeGreaterThan(line.boxBottom);
      expect(line.baselineY).toBeGreaterThan(line.boxBottom);
      expect(line.baselineY).toBeLessThan(line.boxTop);
    }
  });

  it("exposes per-run ranges so each text gets its own hover window", () => {
    // A contact row: email and phone printed side by side on one baseline.
    // Each run becomes its own hit window sized to the text.
    const lines = buildTextLines([
      run("ada@example.com", 72, 700),
      run("+880 1676 095 674", 180, 700),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].runs).toEqual([
      { text: "ada@example.com", x: 72, right: 72 + 15 * 5 },
      { text: "+880 1676 095 674", x: 180, right: 180 + 17 * 5 },
    ]);
  });
});
