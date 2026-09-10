"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { getPdfjs } from "@/lib/pdf/pdfjs";
import { PreviewZoomToolbar } from "./PreviewZoomToolbar";
import {
  computePageCssWidth,
  galleryLayout,
  parsePxToken,
  ZOOM_DEFAULT,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  type PaneMetrics,
  type PreviewMode,
} from "./previewLayout";
import "./PdfCanvasViewer.css";

interface PdfCanvasViewerProps {
  blob: Blob | null;
  /** Play a one-shot appear animation on the pages rendered from this blob —
   *  reserved for a deliberate content swap (e.g. a completed AI import),
   *  not the routine re-render every edit produces. */
  appear?: boolean;
  className?: string;
  "aria-label"?: string;
  onPageCountChange?: (pageCount: number) => void;
}

/** Cap the raster resolution — a 3x display would quadruple render cost for
 *  detail nobody can see at preview size. */
const MAX_PIXEL_RATIO = 2;

/** Resizing fires continuously while the split pane is dragged. */
const RESIZE_DEBOUNCE_MS = 120;

/** Cascade delay between stacked pages — capped so a long resume's later
 *  pages don't lag noticeably behind the first. */
const APPEAR_STAGGER_MS = 80;
const APPEAR_STAGGER_MAX_PAGES = 5;

/**
 * Rasterises a PDF to canvases with pdfjs and swaps the whole set into the
 * DOM in a single mutation, so the previously rendered pages stay on screen
 * right up until the new ones are ready to paint.
 *
 * An `<iframe>` pointed at a blob URL can't do this: changing its `src` tears
 * the old document down before the new one loads, which is what made the
 * preview flash on every edit.
 */
export function PdfCanvasViewer({
  blob,
  appear = false,
  className,
  "aria-label": ariaLabel,
  onPageCountChange,
}: PdfCanvasViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const onPageCountChangeRef = useRef(onPageCountChange);
  // Guards against replaying the animation when this blob is re-rasterized
  // for a reason other than the appear-worthy content swap (e.g. the split
  // pane being resized).
  const appearedForBlobRef = useRef<Blob | null>(null);
  const committedModeRef = useRef<PreviewMode>("fill-width");
  const hasRenderedRef = useRef(false);
  const pageCountRef = useRef(0);
  const swappingRef = useRef(false);
  const swapTimerRef = useRef(0);
  const swapGenRef = useRef(0);
  const [paneMetrics, setPaneMetrics] = useState<PaneMetrics | null>(null);
  const [hasRendered, setHasRendered] = useState(false);
  const [mode, setMode] = useState<PreviewMode>("fill-width");
  // Layout class lags `mode` until the new pages are ready, so the old
  // stack doesn't reflow into Fit/View All rules while pdfjs is still
  // rasterizing the incoming set.
  const [displayMode, setDisplayMode] = useState<PreviewMode>("fill-width");
  const [zoomPercent, setZoomPercent] = useState(ZOOM_DEFAULT);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    onPageCountChangeRef.current = onPageCountChange;
  }, [onPageCountChange]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    let timer = 0;
    let hasMeasured = false;
    const applySize = (entry: ResizeObserverEntry) => {
      if (swappingRef.current) return;
      const width = Math.floor(entry.contentRect.width);
      const height = Math.floor(entry.contentRect.height);
      if (width <= 0 || height <= 0) return;
      const styles = getComputedStyle(scroller);
      setPaneMetrics({
        width,
        height,
        space4: parsePxToken(styles.getPropertyValue("--space-4")),
        space6: parsePxToken(styles.getPropertyValue("--space-6")),
        space16: parsePxToken(styles.getPropertyValue("--space-16")),
        space24: parsePxToken(styles.getPropertyValue("--space-24")),
      });
    };
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const width = Math.floor(entry.contentRect.width);
      const height = Math.floor(entry.contentRect.height);
      if (width <= 0 || height <= 0) return;
      window.clearTimeout(timer);
      // Take the first measurement straight away so nothing delays first paint;
      // only debounce the resizes that follow. Padding changes with the
      // display mode, and ResizeObserver fires for those without a re-bind.
      if (!hasMeasured) {
        hasMeasured = true;
        applySize(entry);
        return;
      }
      timer = window.setTimeout(() => {
        applySize(entry);
      }, RESIZE_DEBOUNCE_MS);
    });
    observer.observe(scroller);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!blob || !paneMetrics) return;
    const requestedMode = mode;
    const fromMode = committedModeRef.current;
    if (swappingRef.current && fromMode === requestedMode) return;

    let isStale = false;
    const shouldAppear = appear && appearedForBlobRef.current !== blob;
    const shouldCrossfade =
      hasRenderedRef.current &&
      fromMode !== requestedMode &&
      !shouldAppear &&
      !prefersReducedMotion();

    const host = pagesRef.current;
    const scroller = scrollRef.current;
    const viewer = viewerRef.current;
    let metrics = paneMetrics;

    if (shouldCrossfade && host && scroller) {
      parkOutgoing({
        host,
        scroller,
        viewer,
        fromMode,
        timerRef: swapTimerRef,
      });
      applyLayout(viewer, requestedMode, pageCountRef.current, paneMetrics);
      const measured = measurePane(scroller);
      if (measured) metrics = measured;
      swappingRef.current = true;
    }

    void (async () => {
      try {
        const { nodes, pageCount: nextCount } = await renderPages(
          blob,
          {
            mode: requestedMode,
            zoomPercent,
            metrics,
          },
          () => isStale,
          shouldAppear,
        );
        if (isStale || !pagesRef.current) return;

        if (shouldAppear) appearedForBlobRef.current = blob;

        const stack = wrapStack(nodes);
        if (shouldCrossfade && scrollRef.current) {
          const gen = ++swapGenRef.current;
          playCrossfade({
            host: pagesRef.current,
            scroller: scrollRef.current,
            incoming: stack,
            gen,
            genRef: swapGenRef,
            timerRef: swapTimerRef,
            swappingRef,
            onDone: () => {
              setDisplayMode(requestedMode);
              setHasRendered(true);
              setPageCount(nextCount);
            },
          });
          committedModeRef.current = requestedMode;
          hasRenderedRef.current = true;
          pageCountRef.current = nextCount;
          onPageCountChangeRef.current?.(nextCount);
        } else {
          applyLayout(viewer, requestedMode, nextCount, metrics);
          pagesRef.current.replaceChildren(stack);
          if (scrollRef.current && fromMode !== requestedMode) {
            scrollRef.current.scrollTop = 0;
          }
          committedModeRef.current = requestedMode;
          hasRenderedRef.current = true;
          pageCountRef.current = nextCount;
          setDisplayMode(requestedMode);
          setHasRendered(true);
          setPageCount(nextCount);
          onPageCountChangeRef.current?.(nextCount);
        }
      } catch (error) {
        swappingRef.current = false;
        if (!isStale) console.error("Preview render failed:", error);
      }
    })();

    return () => {
      isStale = true;
    };
  }, [blob, paneMetrics, appear, mode, zoomPercent]);

  const handleModeChange = useCallback((next: PreviewMode) => {
    setMode(next);
    setZoomPercent(ZOOM_DEFAULT);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomPercent((value) => Math.min(ZOOM_MAX, value + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomPercent((value) => Math.max(ZOOM_MIN, value - ZOOM_STEP));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomPercent(ZOOM_DEFAULT);
  }, []);

  const galleryColumns =
    displayMode === "view-all" && paneMetrics
      ? galleryLayout(paneMetrics, pageCount).columns
      : undefined;

  return (
    <div
      ref={viewerRef}
      className={["pdf-canvas-viewer", className].filter(Boolean).join(" ")}
      data-layout={displayMode}
      style={
        galleryColumns
          ? ({ "--gallery-columns": galleryColumns } as CSSProperties)
          : undefined
      }
    >
      <div
        className="pdf-canvas-viewer__scroll"
        ref={scrollRef}
        role={ariaLabel ? "region" : undefined}
        aria-label={ariaLabel}
      >
        {/* Populated imperatively above — React must not own these children. */}
        <div className="pdf-canvas-viewer__pages" ref={pagesRef} />
        {!hasRendered && (
          <p className="pdf-canvas-viewer__status">Rendering preview…</p>
        )}
      </div>
      <PreviewZoomToolbar
        mode={mode}
        zoomPercent={zoomPercent}
        onModeChange={handleModeChange}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
      />
    </div>
  );
}

interface RenderLayout {
  mode: PreviewMode;
  zoomPercent: number;
  metrics: PaneMetrics;
}

function wrapStack(nodes: Iterable<Node>): HTMLDivElement {
  const stack = document.createElement("div");
  stack.className = "pdf-canvas-viewer__stack";
  stack.append(...nodes);
  return stack;
}

function currentStack(host: HTMLElement): HTMLElement | null {
  return host.querySelector(":scope > .pdf-canvas-viewer__stack");
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function swapDurationMs(el: HTMLElement): number {
  const raw = getComputedStyle(el).getPropertyValue("--duration-slow").trim();
  const parsed = Number.parseFloat(raw);
  const ms =
    raw.endsWith("s") && !raw.endsWith("ms")
      ? parsed * 1000
      : Number.isFinite(parsed)
        ? parsed
        : 250;
  return ms * 1.6;
}

function measurePane(scroller: HTMLElement): PaneMetrics | null {
  const styles = getComputedStyle(scroller);
  const padX =
    parsePxToken(styles.paddingLeft) + parsePxToken(styles.paddingRight);
  const padY =
    parsePxToken(styles.paddingTop) + parsePxToken(styles.paddingBottom);
  const width = Math.floor(scroller.clientWidth - padX);
  const height = Math.floor(scroller.clientHeight - padY);
  if (width <= 0 || height <= 0) return null;
  return {
    width,
    height,
    space4: parsePxToken(styles.getPropertyValue("--space-4")),
    space6: parsePxToken(styles.getPropertyValue("--space-6")),
    space16: parsePxToken(styles.getPropertyValue("--space-16")),
    space24: parsePxToken(styles.getPropertyValue("--space-24")),
  };
}

function applyLayout(
  viewer: HTMLElement | null,
  mode: PreviewMode,
  pageCount: number,
  metrics: PaneMetrics,
): void {
  if (!viewer) return;
  viewer.dataset.layout = mode;
  if (mode === "view-all") {
    viewer.style.setProperty(
      "--gallery-columns",
      String(galleryLayout(metrics, pageCount).columns),
    );
  }
}

function parkOutgoing({
  host,
  scroller,
  viewer,
  fromMode,
  timerRef,
}: {
  host: HTMLElement;
  scroller: HTMLElement;
  viewer: HTMLElement | null;
  fromMode: PreviewMode;
  timerRef: { current: number };
}): void {
  const liveStack = currentStack(host);
  const existing = host.querySelector(":scope > .pdf-canvas-viewer__outgoing");
  if (existing) {
    if (!liveStack) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = 0;
    existing.remove();
  }

  const outgoingStack = liveStack ?? currentStack(host);
  if (!outgoingStack) return;

  const scrollTop = scroller.scrollTop;
  const scrollLeft = scroller.scrollLeft;
  const padding = getComputedStyle(scroller);
  const fromColumns =
    viewer && fromMode === "view-all"
      ? getComputedStyle(viewer).getPropertyValue("--gallery-columns").trim()
      : "";

  const live = getComputedStyle(outgoingStack);
  const outgoing = document.createElement("div");
  outgoing.className = "pdf-canvas-viewer__outgoing";
  outgoing.dataset.mode = fromMode;
  outgoing.style.setProperty("--swap-from-opacity", live.opacity);
  outgoing.style.setProperty("--swap-from-filter", live.filter);
  outgoing.style.setProperty(
    "--swap-from-transform",
    live.transform === "none" ? "none" : live.transform,
  );
  if (fromColumns) {
    outgoing.style.setProperty("--gallery-columns", fromColumns);
  }

  outgoingStack.classList.remove("pdf-canvas-viewer__stack--enter");
  outgoingStack.style.transition = "none";
  outgoingStack.style.opacity = "1";
  outgoingStack.style.transform = "none";
  outgoingStack.style.filter = "none";

  const inner = document.createElement("div");
  inner.className = "pdf-canvas-viewer__outgoing-inner";
  inner.style.paddingTop = padding.paddingTop;
  inner.style.paddingRight = padding.paddingRight;
  inner.style.paddingBottom = padding.paddingBottom;
  inner.style.paddingLeft = padding.paddingLeft;
  inner.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
  inner.appendChild(outgoingStack);
  outgoing.appendChild(inner);
  host.appendChild(outgoing);
}

function playCrossfade({
  host,
  scroller,
  incoming,
  gen,
  genRef,
  timerRef,
  swappingRef,
  onDone,
}: {
  host: HTMLElement;
  scroller: HTMLElement;
  incoming: HTMLDivElement;
  gen: number;
  genRef: { current: number };
  timerRef: { current: number };
  swappingRef: { current: boolean };
  onDone: () => void;
}): void {
  const outgoingNodes = [
    ...host.querySelectorAll(":scope > .pdf-canvas-viewer__outgoing"),
  ];
  incoming.classList.add("pdf-canvas-viewer__stack--enter");
  host.replaceChildren(incoming, ...outgoingNodes);
  scroller.scrollTop = 0;
  scroller.scrollLeft = 0;
  void incoming.offsetWidth;
  for (const node of outgoingNodes) {
    void (node as HTMLElement).offsetWidth;
  }
  incoming.classList.remove("pdf-canvas-viewer__stack--enter");
  for (const node of outgoingNodes) {
    node.classList.add("pdf-canvas-viewer__outgoing--leave");
  }

  window.clearTimeout(timerRef.current);
  const duration = swapDurationMs(host);
  timerRef.current = window.setTimeout(() => {
    if (genRef.current !== gen) return;
    host
      .querySelectorAll(":scope > .pdf-canvas-viewer__outgoing")
      .forEach((node) => node.remove());
    timerRef.current = 0;
    swappingRef.current = false;
    onDone();
  }, duration + 50);
}

/**
 * Draws pages off-screen at the mode's CSS width. Returns detached slot
 * nodes; nothing reaches the DOM until the caller decides to swap.
 */
async function renderPages(
  blob: Blob,
  layout: RenderLayout,
  isStale: () => boolean,
  appear: boolean,
): Promise<{ nodes: HTMLElement[]; pageCount: number }> {
  const pdfjs = await getPdfjs();
  const data = await blob.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data });

  try {
    const pdfDoc = await loadingTask.promise;
    const pageCount = pdfDoc.numPages;
    if (isStale()) return { nodes: [], pageCount };
    if (pageCount < 1) return { nodes: [], pageCount };

    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const nodes: HTMLElement[] = [];

    for (let number = 1; number <= pageCount; number += 1) {
      if (isStale()) return { nodes: [], pageCount };

      const page = await pdfDoc.getPage(number);
      const unscaled = page.getViewport({ scale: 1 });
      const cssWidth = computePageCssWidth(
        layout.mode,
        layout.zoomPercent,
        layout.metrics,
        { width: unscaled.width, height: unscaled.height },
        pageCount,
      );
      const viewport = page.getViewport({
        scale: (cssWidth / unscaled.width) * pixelRatio,
      });

      const canvas = document.createElement("canvas");
      canvas.className = "pdf-canvas-viewer__page";
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      if (layout.mode === "view-all") {
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        canvas.style.aspectRatio = `${unscaled.width} / ${unscaled.height}`;
      } else {
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${Math.floor(viewport.height / pixelRatio)}px`;
      }
      if (appear) {
        canvas.classList.add("pdf-canvas-viewer__page--appear");
        const staggerIndex = Math.min(number - 1, APPEAR_STAGGER_MAX_PAGES);
        canvas.style.animationDelay = `${staggerIndex * APPEAR_STAGGER_MS}ms`;
      }

      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not get a 2D canvas context.");

      await page.render({ canvas, canvasContext: context, viewport }).promise;

      const slot = document.createElement("div");
      slot.className = "pdf-canvas-viewer__slot";
      if (layout.mode === "fit") {
        slot.style.minHeight = `${layout.metrics.height}px`;
      }
      slot.appendChild(canvas);
      nodes.push(slot);
    }

    return { nodes, pageCount };
  } finally {
    void loadingTask.destroy();
  }
}
