"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { getPdfjs } from "@/lib/pdf/pdfjs";
import { findFieldByText, makeFieldUpdater } from "@/lib/editor/fieldMatch";
import { useEditorStore } from "@/lib/store/editorStore";
import type { ResumeData } from "@/lib/schema/resume";
import { digitsOnly, isSystemAlternatePhone } from "@/lib/contact/system";
import { PreviewZoomToolbar } from "./PreviewZoomToolbar";
import { InlineEditor } from "./InlineEditor";
import { AlternatePhoneCard } from "./AlternatePhoneCard";
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
  /** The current resume draft — used to match clicked text to editable
   *  fields (name, email, bullets, summary, …) for inline editing. Only
   *  LivePreviewPane supplies it; other viewers just render pages. */
  data?: ResumeData;
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
  data,
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
  const [inlineEditor, setInlineEditor] = useState<{
    top: number;
    left: number;
    width: number;
    field: string;
    value: string;
    label: string;
    update: (nextValue: string) => void;
  } | null>(null);
  /** Set when the system alternate phone number is clicked — it can't be
   *  text-edited (company data, not a stored field), so it gets an
   *  explanatory card with a hide action instead. */
  const [alternateCard, setAlternateCard] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const handleHitClick = useCallback(
    (
      event: MouseEvent,
      text: string,
      target: HitTargetRect,
      xHint?: number,
    ) => {
      if (!data) return;
      const container = viewerRef.current;
      const containerRect = container?.getBoundingClientRect();

      const field = findFieldByText(data, text, xHint);
      if (!field) return;

      const update = makeFieldUpdater(
        {
          setPersonalInfo: useEditorStore.getState().setPersonalInfo,
          setSummary: useEditorStore.getState().setSummary,
          updateSection: useEditorStore.getState().updateSection,
          updateEntry: useEditorStore.getState().updateEntry,
        },
        field,
        data,
      );

      // Size the editor wider than the clicked text so typing feels spacious
      // and the popover never hugs the text too tightly. A usability floor
      // keeps tiny runs (a date, a tag) typable; the floor is centered on the
      // text so the editor stays visually attached to what was clicked.
      const width = Math.max(target.width + 60, INLINE_EDITOR_MIN_WIDTH);
      let left = target.left - (containerRect?.left || 0);
      left -= (width - target.width) / 2;
      const containerWidth = containerRect ? containerRect.width : Number.POSITIVE_INFINITY;
      left = Math.max(0, Math.min(left, containerWidth - width));

      setInlineEditor({
        // Sit just BELOW the clicked text (CSS adds a token gap): the
        // original stays visible while editing.
        top: Math.round(target.top + target.height - (containerRect?.top || 0)),
        left: Math.round(left),
        width: Math.round(width),
        field: field.field,
        value: field.currentValue,
        label: field.label,
        update,
      });
    },
    [data],
  );

  useEffect(() => {
    onPageCountChangeRef.current = onPageCountChange;
  }, [onPageCountChange]);

  const handleAlternateClick = useCallback((target: HitTargetRect) => {
    const containerRect = viewerRef.current?.getBoundingClientRect();
    // Widen to a readable card, centered on the clicked number.
    const width = Math.max(target.width, 280);
    let left = target.left - (containerRect?.left || 0);
    left -= (width - target.width) / 2;
    const containerWidth = containerRect
      ? containerRect.width
      : Number.POSITIVE_INFINITY;
    left = Math.max(0, Math.min(left, containerWidth - width));
    setAlternateCard({
      top: Math.round(target.top + target.height - (containerRect?.top || 0)),
      left: Math.round(left),
      width: Math.round(width),
    });
  }, []);

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
          handleHitClick,
          data,
          handleAlternateClick,
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
  }, [blob, paneMetrics, appear, data, mode, zoomPercent, handleHitClick, handleAlternateClick]);

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
      {/* Mounted only once the first pages are on screen, so its appear
          animation plays when the preview is ready, not while it loads. */}
      {hasRendered && (
        <PreviewZoomToolbar
          mode={mode}
          zoomPercent={zoomPercent}
          onModeChange={handleModeChange}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
        />
      )}
      {inlineEditor && (
        <InlineEditor
          top={inlineEditor.top}
          left={inlineEditor.left}
          width={inlineEditor.width}
          value={inlineEditor.value}
          label={inlineEditor.label}
          onConfirm={(nextValue) => {
            inlineEditor.update(nextValue);
            setInlineEditor(null);
          }}
          onCancel={() => setInlineEditor(null)}
        />
      )}
      {alternateCard && (
        <AlternatePhoneCard
          top={alternateCard.top}
          left={alternateCard.left}
          width={alternateCard.width}
          onHide={() => useEditorStore.getState().setShowAlternatePhone(false)}
          onClose={() => setAlternateCard(null)}
        />
      )}
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
 * Each page slot also receives invisible hit-area overlays over rendered
 * text lines so users can click to edit inline — overlays whose text maps
 * to no editable field (e.g. the system alternate phone, which is derived
 * display data, not a field) render without the interactive affordance and
 * never open an editor.
 */
async function renderPages(
  blob: Blob,
  layout: RenderLayout,
  isStale: () => boolean,
  appear: boolean,
  onHitClick?: (
    event: MouseEvent,
    text: string,
    target: HitTargetRect,
    xHint: number,
  ) => void,
  resumeData?: ResumeData,
  onAlternateClick?: (target: HitTargetRect) => void,
): Promise<{ nodes: HTMLElement[]; pageCount: number }> {
  const pdfjs = await getPdfjs();
  const bytes = await blob.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: bytes });

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

      // Group the page's text into visual lines and lay one clickable
      // overlay over each — the line is the natural click unit, and a single
      // line of a wrapped bullet still matches its full field via substring
      // matching in findFieldByText.
      const textContent = await page.getTextContent();
      const scale = cssWidth / unscaled.width;
      const isEditableText =
        onHitClick && resumeData
          ? (text: string) => findFieldByText(resumeData, text) !== null
          : () => false;
      for (const line of buildTextLines(textContent.items)) {
        // One hit window per TEXT RUN, not per line: the hover ring, the
        // tooltip, and the editing popover all then hug exactly the text
        // under the cursor — a contact row's email, mobile, and alternate
        // are three separate windows on one shared, pairwise-clamped band.
        // pdfjs baselines are y-up; flip the band to CSS top-origin
        // (visual top = band's larger y).
        const bandTop = Math.round((unscaled.height - line.boxTop) * scale);
        const bandHeight = Math.round(
          (line.boxTop - line.boxBottom) * scale,
        );
        for (const run of line.runs) {
          const overlay = document.createElement("div");
          overlay.className = "pdf-canvas-viewer__hit";
          overlay.style.left = `${Math.round(run.x * scale)}px`;
          overlay.style.top = `${bandTop}px`;
          overlay.style.width = `${Math.round((run.right - run.x) * scale)}px`;
          overlay.style.height = `${bandHeight}px`;
          overlay.title = run.text;
          overlay.dataset.text = run.text;
          overlay.dataset.pageNumber = String(number);
          // The system alternate phone isn't a stored field, so it can't be
          // text-edited — but it still gets the ring and pointer: clicking
          // it opens the explain/hide card. Row labels stay fully inert.
          const alternate = isSystemAlternatePhone(digitsOnly(run.text));
          const editable = isEditableText(run.text);
          overlay.dataset.editable = String(editable || alternate);
          if (alternate) overlay.dataset.role = "alternate";

          overlayInfo.set(overlay, { text: run.text, editable, alternate });
          slot.appendChild(overlay);
        }
      }

      nodes.push(slot);

      // One click handler per page slot, not one per overlay: overlapping
      // boxes would let whichever renders last swallow the click. Resolving
      // to the SMALLEST overlay containing the point means a click always
      // lands on the text it was aimed at.
      if (onHitClick) {
        slot.addEventListener("click", (event) => {
          const overlay = pickHitAtPoint(slot, event.clientX, event.clientY);
          if (!overlay) return;
          const info = overlayInfo.get(overlay);
          if (!info) return;
          if (info.alternate) {
            // Fixed system number — the component opens its explain/hide
            // card instead of an editor.
            onAlternateClick?.(overlay.getBoundingClientRect());
            return;
          }
          // Derived display values that map to no field (row labels)
          // aren't actionable — clicking them does nothing.
          if (!info.editable) return;
          const rect = overlay.getBoundingClientRect();
          // Where in the run the cursor landed, 0–1 — a printed date range
          // uses it to decide start vs end.
          const xHint = Math.min(
            1,
            Math.max(0, (event.clientX - rect.left) / (rect.width || 1)),
          );
          onHitClick(event, info.text, rect, xHint);
        });
      }
    }

    return { nodes, pageCount };
  } finally {
    void loadingTask.destroy();
  }
}

/** Viewport-space rectangle of the clicked text run — the editing popover
 *  is sized and anchored to this, not to the whole line. */
interface HitTargetRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Smallest usable editing width for narrow runs (a date, a tag) — room
 *  for the caption row and the confirm/cancel buttons. */
const INLINE_EDITOR_MIN_WIDTH = 260;

/** Items whose baselines sit within this fraction of the taller glyph run
 *  are one visual line — kerning-level offsets won't split a line, a real
 *  line break will. */
const LINE_Y_TOLERANCE = 0.4;

/** Hit boxes hug the actual glyph band (ascent above the baseline,
 *  descent below) instead of a full font-height block anchored at the
 *  baseline — the old box hung empty headroom down over smaller lines. */
const GLYPH_ASCENT = 0.75;
const GLYPH_DESCENT = 0.25;

interface PdfTextLine {
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
   *  than matching the whole joined line. */
  runs: Array<{ text: string; x: number; right: number }>;
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
      runs.push({ text: run.str, x: runX, right: runX + run.width });
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

/** Maps each per-run hit window to the text it covers and whether that
 *  text is an editable field or the fixed system alternate number. Entries
 *  die with the overlays when a render replaces the DOM. */
const overlayInfo = new WeakMap<
  HTMLDivElement,
  { text: string; editable: boolean; alternate: boolean }
>();

/**
 * Picks the smallest hit overlay whose box contains the viewport point.
 * Smallest wins because larger boxes from taller adjacent lines can cover
 * a smaller line — the small one is what the cursor is actually on.
 */
function pickHitAtPoint(
  slot: HTMLElement,
  x: number,
  y: number,
): HTMLDivElement | null {
  let best: HTMLDivElement | null = null;
  let bestArea = Number.POSITIVE_INFINITY;
  for (const child of slot.children) {
    if (!(child instanceof HTMLDivElement)) continue;
    if (!child.classList.contains("pdf-canvas-viewer__hit")) continue;
    const rect = child.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      continue;
    }
    const area = rect.width * rect.height;
    if (area < bestArea) {
      best = child;
      bestArea = area;
    }
  }
  return best;
}
