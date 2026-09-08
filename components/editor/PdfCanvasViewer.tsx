"use client";

import { useEffect, useRef, useState } from "react";
import { getPdfjs } from "@/lib/pdf/pdfjs";
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
  const onPageCountChangeRef = useRef(onPageCountChange);
  // Guards against replaying the animation when this blob is re-rasterized
  // for a reason other than the appear-worthy content swap (e.g. the split
  // pane being resized).
  const appearedForBlobRef = useRef<Blob | null>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [hasRendered, setHasRendered] = useState(false);

  onPageCountChangeRef.current = onPageCountChange;

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    let timer = 0;
    let hasMeasured = false;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      if (width <= 0) return;
      window.clearTimeout(timer);
      // Take the first measurement straight away so nothing delays first paint;
      // only debounce the resizes that follow.
      if (!hasMeasured) {
        hasMeasured = true;
        setPageWidth(width);
        return;
      }
      timer = window.setTimeout(() => {
        setPageWidth(width);
      }, RESIZE_DEBOUNCE_MS);
    });
    observer.observe(scroller);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!blob || pageWidth <= 0) return;
    let isStale = false;

    const shouldAppear = appear && appearedForBlobRef.current !== blob;

    void (async () => {
      try {
        const { canvases, pageCount } = await renderPages(
          blob,
          pageWidth,
          () => isStale,
          shouldAppear,
        );
        const host = pagesRef.current;
        if (isStale || !host) return;

        if (shouldAppear) appearedForBlobRef.current = blob;

        // One mutation, one paint. Restoring scroll afterwards keeps the
        // reader where they were instead of jumping to page one on every edit.
        const scroller = scrollRef.current;
        const scrollTop = scroller?.scrollTop ?? 0;
        host.replaceChildren(...canvases);
        if (scroller) scroller.scrollTop = scrollTop;
        setHasRendered(true);
        onPageCountChangeRef.current?.(pageCount);
      } catch (error) {
        if (!isStale) console.error("Preview render failed:", error);
      }
    })();

    return () => {
      isStale = true;
    };
  }, [blob, pageWidth, appear]);

  return (
    <div
      className={["pdf-canvas-viewer", className].filter(Boolean).join(" ")}
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
  );
}

/**
 * Draws pages off-screen at `pageWidth` CSS pixels. Returns detached
 * canvases; nothing reaches the DOM until the caller decides to swap.
 */
async function renderPages(
  blob: Blob,
  pageWidth: number,
  isStale: () => boolean,
  appear: boolean,
): Promise<{ canvases: HTMLCanvasElement[]; pageCount: number }> {
  const pdfjs = await getPdfjs();
  const data = await blob.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data });

  try {
    const pdfDoc = await loadingTask.promise;
    const pageCount = pdfDoc.numPages;
    if (isStale()) return { canvases: [], pageCount };
    if (pageCount < 1) return { canvases: [], pageCount };

    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const canvases: HTMLCanvasElement[] = [];

    for (let number = 1; number <= pageCount; number += 1) {
      if (isStale()) return { canvases: [], pageCount };

      const page = await pdfDoc.getPage(number);
      const unscaled = page.getViewport({ scale: 1 });
      const cssWidth = pageWidth;
      const viewport = page.getViewport({
        scale: (cssWidth / unscaled.width) * pixelRatio,
      });

      const canvas = document.createElement("canvas");
      canvas.className = "pdf-canvas-viewer__page";
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${Math.floor(viewport.height / pixelRatio)}px`;
      if (appear) {
        canvas.classList.add("pdf-canvas-viewer__page--appear");
        const staggerIndex = Math.min(number - 1, APPEAR_STAGGER_MAX_PAGES);
        canvas.style.animationDelay = `${staggerIndex * APPEAR_STAGGER_MS}ms`;
      }

      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not get a 2D canvas context.");

      await page.render({ canvas, canvasContext: context, viewport }).promise;
      canvases.push(canvas);
    }

    return { canvases, pageCount };
  } finally {
    void loadingTask.destroy();
  }
}
