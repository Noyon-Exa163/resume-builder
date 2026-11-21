/**
 * Groups pdf.js text items into the visual lines the preview's click-to-edit
 * overlays sit on. Pure pdfjs-geometry — no React, no DOM — so the editor
 * component and the tests can share it without dragging the viewer along.
 */

/** Items whose baselines sit within this fraction of the taller glyph run
 *  are one visual line — kerning-level offsets won't split a line, a real
 *  line break will. */
export const LINE_Y_TOLERANCE = 0.4;

/** Hit boxes hug the actual glyph band (ascent above the baseline,
 *  descent below) instead of a full font-height block anchored at the
 *  baseline — the old box hung empty headroom down over smaller lines. */
export const GLYPH_ASCENT = 0.75;
export const GLYPH_DESCENT = 0.25;

export interface PdfTextLine {
  text: string;
  /** Left edge and baseline (y-up) in unscaled PDF user-space units. */
  x: number;
  baselineY: number;
  /** Max glyph-run height on the line. */
  height: number;
  /** Right edge, for the overlay width. */
  right: number;
  /** Hit-box vertical band (y-up), covering the glyphs (ascent→descent)
   *  and clamped against neighbouring lines so boxes never overlap — a
   *  tall line's box must not reach down over the smaller line below it. */
  boxTop: number;
  boxBottom: number;
  /** The individual pdfjs runs on this line, left-to-right. A line often
   *  prints several fields side by side (contact rows, entry headers), so
   *  click resolution must be able to pick the run under the cursor rather
   *  than matching the whole joined line. `baseline` is the run's own
   *  baseline (y-up) — the line's bucketed baseline can differ slightly
   *  (a taller run sets the bucket), and pill geometry anchors on it. */
  runs: Array<{ text: string; x: number; right: number; baseline: number }>;
}

interface TextRun {
  str: string;
  width: number;
  height: number;
  /** pdfjs transform [a, b, c, d, e, f] — e is x, f is the baseline (y-up). */
  transform: number[];
}

/**
 * Groups pdfjs text items into visual lines. pdfjs emits one item per
 * printed run, so one line can arrive as several fragments (styled runs,
 * kerning splits) and a wrapped paragraph as several line boxes. Sorting by
 * baseline (PDF y is bottom-up) and bucketing runs whose baselines sit
 * within tolerance yields one entry per rendered line, whose combined text
 * is what findFieldByText matches clicked text against.
 */
export function buildTextLines(items: readonly unknown[]): PdfTextLine[] {
  const runs: TextRun[] = [];
  for (const item of items) {
    const candidate = item as Partial<TextRun> | null;
    if (
      candidate &&
      typeof candidate.str === "string" &&
      candidate.str.trim() &&
      Array.isArray(candidate.transform) &&
      candidate.transform.length >= 6
    ) {
      runs.push({
        str: candidate.str,
        width: typeof candidate.width === "number" ? candidate.width : 0,
        height:
          typeof candidate.height === "number" && candidate.height > 0
            ? candidate.height
            : 12,
        transform: candidate.transform,
      });
    }
  }
  if (runs.length === 0) return [];

  // Strict numeric sort — baseline descending (top of page first), x
  // ascending as a tiebreak before bucketing below re-sorts each line.
  const sorted = [...runs].sort(
    (a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4],
  );

  const lines: PdfTextLine[] = [];
  let bucket: TextRun[] = [];
  let bucketBaseline = 0;
  let bucketHeight = 0;

  const flushBucket = () => {
    if (bucket.length === 0) return;
    bucket.sort((a, b) => a.transform[4] - b.transform[4]);
    let text = "";
    let x = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let height = 0;
    const runs: PdfTextLine["runs"] = [];
    bucket.forEach((run, index) => {
      const runX = run.transform[4];
      if (index > 0) {
        const previous = bucket[index - 1];
        const gap = runX - (previous.transform[4] + previous.width);
        // Fragments of the same word (kerning splits) join tight; distinct
        // runs on one line (contact row, name + dates) get a space.
        if (gap > run.height * 0.15) text += " ";
      }
      text += run.str;
      x = Math.min(x, runX);
      right = Math.max(right, runX + run.width);
      height = Math.max(height, run.height);
      runs.push({
        text: run.str,
        x: runX,
        right: runX + run.width,
        baseline: run.transform[5],
      });
    });
    lines.push({
      text,
      x,
      baselineY: bucketBaseline,
      height,
      right,
      runs,
      // Initial glyph band in y-up page space: ascent ABOVE the baseline
      // (larger y) up to boxTop, descent BELOW (smaller y) down to
      // boxBottom. The pairwise clamp after the loop trims band tops so
      // neighbours never overlap visually or in hit-testing.
      boxBottom: bucketBaseline - height * GLYPH_DESCENT,
      boxTop: bucketBaseline + height * GLYPH_ASCENT,
    });
    bucket = [];
  };

  for (const run of sorted) {
    const baseline = run.transform[5];
    if (
      bucket.length === 0 ||
      Math.abs(baseline - bucketBaseline) <=
        LINE_Y_TOLERANCE * Math.max(bucketHeight, run.height)
    ) {
      if (bucket.length === 0) {
        bucketBaseline = baseline;
        bucketHeight = run.height;
      }
      bucket.push(run);
      bucketHeight = Math.max(bucketHeight, run.height);
    } else {
      flushBucket();
      bucketBaseline = baseline;
      bucketHeight = run.height;
      bucket.push(run);
    }
  }
  flushBucket();

  // Boxes were built top-down (buckets follow the baseline-descending
  // sort). Where two vertically-adjacent boxes overlap horizontally — the
  // only case where one could steal the other's clicks — trim the lower
  // box's visual top down to the upper box's visual bottom. Trimming into
  // the ascender headroom is safe: glyph tops sit well below the band top,
  // so the clickable band still covers every character.
  for (let i = 1; i < lines.length; i += 1) {
    const above = lines[i - 1];
    const line = lines[i];
    const horizontalOverlap = above.x < line.right && line.x < above.right;
    if (!horizontalOverlap) continue;
    if (line.boxTop > above.boxBottom) {
      line.boxTop = above.boxBottom;
    }
    // Extremely tight leading can swallow more than the headroom — keep a
    // minimum clickable band anchored at the baseline.
    const minBand = line.height * 0.4;
    if (line.boxTop - line.boxBottom < minBand) {
      line.boxTop = line.boxBottom + minBand;
    }
  }

  return lines;
}

