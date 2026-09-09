import { describe, expect, it } from "vitest";
import {
  computePageCssWidth,
  galleryLayout,
  type PaneMetrics,
} from "@/components/editor/previewLayout";

const metrics: PaneMetrics = {
  width: 600,
  height: 800,
  space4: 16,
  space6: 24,
  space16: 64,
  space24: 96,
};

const a4 = { width: 595, height: 842 };

describe("computePageCssWidth", () => {
  it("fills the pane width at 100% zoom in fill-width mode", () => {
    expect(computePageCssWidth("fill-width", 100, metrics, a4)).toBe(600);
  });

  it("scales fill-width by the zoom multiplier", () => {
    expect(computePageCssWidth("fill-width", 150, metrics, a4)).toBe(900);
  });

  it("fits both axes inside the pane with equal vertical gaps", () => {
    const cssWidth = computePageCssWidth("fit", 100, metrics, a4);
    const scale = cssWidth / a4.width;
    const cssHeight = a4.height * scale;
    const vGap = 64;
    const hGap = 24;
    expect(cssWidth).toBeLessThanOrEqual(metrics.width - hGap * 2);
    expect(cssHeight).toBeLessThanOrEqual(metrics.height - vGap * 2);
    expect(cssWidth).toBeGreaterThan(metrics.width / 2);
  });

  it("uses a gallery cell width in view-all mode, ignoring zoom", () => {
    const at100 = computePageCssWidth("view-all", 100, metrics, a4);
    const at200 = computePageCssWidth("view-all", 200, metrics, a4);
    expect(at100).toBe(at200);
    expect(at100).toBe(galleryLayout(metrics).thumbWidth);
    expect(galleryLayout(metrics).columns).toBeGreaterThan(1);
    expect(galleryLayout(metrics, 2).columns).toBe(2);
    expect(galleryLayout(metrics, 2).thumbWidth).toBeGreaterThan(
      galleryLayout(metrics, 3).thumbWidth,
    );
  });
});
