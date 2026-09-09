export type PreviewMode = "fill-width" | "fit" | "view-all";

export const ZOOM_MIN = 50;
export const ZOOM_MAX = 200;
export const ZOOM_STEP = 10;
export const ZOOM_DEFAULT = 100;

export interface PaneMetrics {
  width: number;
  height: number;
  space4: number;
  space6: number;
  space16: number;
  space24: number;
}

export interface UnscaledPage {
  width: number;
  height: number;
}

/**
 * CSS pixel width to rasterize a page at, given the active display mode.
 *
 * Fill Width uses the pane's content width (today's implicit default).
 * Fit sizes the page so both axes land inside the pane, leaving equal
 * vertical gaps that can host the floating toolbar without covering it.
 * View All uses one cell of the thumbnail grid.
 */
export function computePageCssWidth(
  mode: PreviewMode,
  zoomPercent: number,
  metrics: PaneMetrics,
  unscaled: UnscaledPage,
  pageCount?: number,
): number {
  const zoom = zoomPercent / 100;

  if (mode === "fill-width") {
    return Math.max(1, Math.floor(metrics.width * zoom));
  }

  if (mode === "view-all") {
    return Math.max(1, galleryLayout(metrics, pageCount).thumbWidth);
  }

  const hGap = metrics.space6;
  // Match the toolbar's occupied band (offset + bar) so the page sits in
  // equal remaining space above and below — the bar floats in the bottom gap.
  const vGap = Math.max(metrics.space6, metrics.space16);
  const availW = Math.max(1, metrics.width - hGap * 2);
  const availH = Math.max(1, metrics.height - vGap * 2);
  const fitScale = Math.min(availW / unscaled.width, availH / unscaled.height);
  return Math.max(1, Math.floor(unscaled.width * fitScale * zoom));
}

export function galleryLayout(
  metrics: PaneMetrics,
  pageCount?: number,
): {
  columns: number;
  thumbWidth: number;
} {
  const minCol = metrics.space24 * 2;
  const gap = metrics.space4;
  const fitted = Math.max(
    1,
    Math.min(4, Math.floor(metrics.width / minCol) || 1),
  );
  const columns =
    pageCount && pageCount > 0 ? Math.min(fitted, pageCount) : fitted;
  const thumbWidth = Math.floor(
    (metrics.width - gap * Math.max(0, columns - 1)) / columns,
  );
  return { columns, thumbWidth: Math.max(1, thumbWidth) };
}

export function parsePxToken(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
