/** One recognised fragment of text and where it sits on the page (pixels). */
export interface OcrBox {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** A vertical gutter has to beat a horizontal gap by this much to win, since
 *  line spacing alone creates many small horizontal gaps in any column. */
const VERTICAL_CUT_BIAS = 2;

interface Cut {
  gap: number;
  /** Boxes before / after the gap, in reading order. */
  first: OcrBox[];
  second: OcrBox[];
}

/**
 * Finds the widest empty gap along one axis. `lo`/`hi` pick the axis
 * (y0/y1 for a horizontal cut, x0/x1 for a vertical one).
 */
function findWidestCut(
  boxes: OcrBox[],
  lo: "x0" | "y0",
  hi: "x1" | "y1",
): Cut | null {
  const sorted = [...boxes].sort((a, b) => a[lo] - b[lo]);
  let reach = sorted[0][hi];
  let best: Cut | null = null;
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = sorted[i][lo] - reach;
    if (gap > 0 && (!best || gap > best.gap)) {
      best = { gap, first: sorted.slice(0, i), second: sorted.slice(i) };
    }
    reach = Math.max(reach, sorted[i][hi]);
  }
  return best;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/** Joins boxes that share a row left-to-right, rows top-to-bottom. */
function joinAsRows(boxes: OcrBox[]): string[] {
  const sorted = [...boxes].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const rows: OcrBox[][] = [];
  for (const box of sorted) {
    const row = rows[rows.length - 1];
    const centreY = (box.y0 + box.y1) / 2;
    if (row && centreY < Math.max(...row.map((b) => b.y1))) row.push(box);
    else rows.push([box]);
  }
  return rows.map((row) =>
    row
      .sort((a, b) => a.x0 - b.x0)
      .map((b) => b.text)
      .join(" "),
  );
}

function orderRecursively(boxes: OcrBox[], minGap: number): string[] {
  if (boxes.length < 2) return joinAsRows(boxes);

  const horizontal = findWidestCut(boxes, "y0", "y1");
  const vertical = findWidestCut(boxes, "x0", "x1");
  const horizontalScore = horizontal?.gap ?? 0;
  const verticalScore = (vertical?.gap ?? 0) * VERTICAL_CUT_BIAS;

  const cut = verticalScore > horizontalScore ? vertical : horizontal;
  const score = Math.max(horizontalScore, verticalScore);
  if (!cut || score < minGap) return joinAsRows(boxes);

  return [
    ...orderRecursively(cut.first, minGap),
    ...orderRecursively(cut.second, minGap),
  ];
}

/**
 * Turns positioned OCR fragments into text in human reading order.
 *
 * Tesseract reads a multi-column page (a sidebar next to the main column, as
 * many CVs have) straight across, which interleaves the columns line by line
 * and leaves the AI parser with scrambled sections. This recursively splits
 * the page at its widest gap — XY-cut — so each column is read top to bottom
 * before moving to the next.
 */
export function orderOcrBoxes(boxes: OcrBox[]): string {
  const usable = boxes.filter((b) => b.text.trim());
  if (usable.length === 0) return "";
  const minGap = median(usable.map((b) => b.y1 - b.y0)) * 0.5;
  return orderRecursively(usable, minGap).join("\n");
}
