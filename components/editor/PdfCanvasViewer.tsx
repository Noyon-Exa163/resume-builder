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
import { resolveSkillIcon } from "@/lib/skillIcons/resolveSkillIcon";
import { buildTextLines } from "@/lib/pdf/textLines";
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
  /** Whether clicking preview text may open the inline editor and write to
   *  the draft. False (the default) renders no click affordances at all —
   *  view-only access must never write to the store. */
  editable?: boolean;
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
  editable = false,
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

  // The current draft travels in a ref: LivePreviewPane couples `data` and
  // `blob` (a new draft produces a new blob), but keying the render effect
  // on `data` made it re-run the whole pdfjs pipeline even when the blob was
  // byte-identical. The effect keys on the blob instead and reads the draft
  // through this ref when it builds the click overlays.
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const handleHitClick = useCallback(
    (
      event: MouseEvent,
      text: string,
      target: HitTargetRect,
      xHint?: number,
    ) => {
      const draft = dataRef.current;
      if (!draft) return;
      const container = viewerRef.current;
      const containerRect = container?.getBoundingClientRect();

      const field = findFieldByText(draft, text, xHint);
      if (!field) return;

      const update = makeFieldUpdater(
        {
          setPersonalInfo: useEditorStore.getState().setPersonalInfo,
          setSummary: useEditorStore.getState().setSummary,
          updateSection: useEditorStore.getState().updateSection,
          updateEntry: useEditorStore.getState().updateEntry,
        },
        field,
        draft,
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
    [],
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
        // View-only access gets bare pages: no hit windows, no click
        // handlers, nothing that could write to the store.
        const canEdit = editable && dataRef.current != null;
        const { nodes, pageCount: nextCount } = await renderPages(
          blob,
          {
            mode: requestedMode,
            zoomPercent,
            metrics,
          },
          () => isStale,
          shouldAppear,
          canEdit ? handleHitClick : undefined,
          canEdit ? dataRef.current : undefined,
          canEdit ? handleAlternateClick : undefined,
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
  }, [blob, paneMetrics, appear, editable, mode, zoomPercent, handleHitClick, handleAlternateClick]);

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
/** Skill chips print as fully-rounded pills — their box is reconstructed
 *  around the label's baseline from measurements of the real default
 *  template's rendered output (a rendered SkillList chip, border included):
 *  the drawn chip spans 10.28pt above and 5.60pt below the unlifted
 *  baseline, center +2.34pt. The template lifts the label by
 *  SKILL_LABEL_OFFSET_TOP (0.735pt, Inter ascent/cap metrics in
 *  templates/exabyting/tokens.ts), which raises the baseline the PDF
 *  reports, so relative to that reported baseline the chip center sits
 *  +2.34 − 0.735 ≈ 1.6pt above it and the chip half-height is 7.94pt; the
 *  label sits 6.5pt (border + padding) from each chip edge, plus the icon
 *  slot when the chip has an icon. SKILL_CHIP_INSET pulls the highlight a
 *  hair inside the chip's own border so reconstruction error can never
 *  push the hover tint across it. */
const SKILL_CHIP_PAD_X = 6.5;
const SKILL_CHIP_CENTER_ABOVE_BASELINE = 1.6;
const SKILL_CHIP_HALF_HEIGHT = 7.94;
const SKILL_ICON_SIZE = 8;
const SKILL_ICON_GAP = 3;
const SKILL_CHIP_INSET = 1.5;

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
      // matching in findFieldByText. No click handler, no text extraction:
      // a view-only preview renders bare pages.
      const textContent = onHitClick ? await page.getTextContent() : null;
      const scale = cssWidth / unscaled.width;
      const fieldForText =
        onHitClick && resumeData
          ? (text: string) => findFieldByText(resumeData, text)
          : () => null;
      // Labels the default template prints inside skill pills: every tag of
      // a skills-section entry, plus an entry's title when it has no tags
      // (an uncategorised skill collects into the same chip row). Matched on
      // trimmed, lowercased run text — a joined tag line ("React · Node")
      // equals no single label and keeps the plain rectangular hover.
      const pillLabels = new Set<string>();
      for (const section of resumeData?.sections ?? []) {
        if (section.kind !== "skills") continue;
        for (const entry of section.entries) {
          for (const tag of entry.tags) {
            if (tag.trim()) pillLabels.add(tag.trim().toLowerCase());
          }
          if (entry.tags.length === 0 && entry.title?.trim()) {
            pillLabels.add(entry.title.trim().toLowerCase());
          }
        }
      }
      for (const line of buildTextLines(textContent?.items ?? [])) {
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
          const matched = fieldForText(run.text);
          const editable = matched !== null;
          overlay.dataset.editable = String(editable || alternate);
          if (alternate) overlay.dataset.role = "alternate";
          // A chip label IS a pill: rebuild the chip's own box around the
          // run's baseline — measured chip extent above/below the baseline,
          // its horizontal padding (plus the icon slot when this section
          // shows icons and the label resolves to one) — then inset it. The
          // line band is NOT used: it is clamped against neighbouring lines,
          // so its center is not the chip's center. Anchored on the baseline
          // and inset, the hover tint fills the pill from inside and can't
          // cross its border; edges round INWARD so subpixel error shrinks
          // the box, never grows it.
          if (matched && pillLabels.has(run.text.trim().toLowerCase())) {
            overlay.dataset.shape = "pill";
            const sectionMatch = /^sections\[(\d+)\]\./.exec(matched.field);
            const section = sectionMatch
              ? resumeData?.sections[Number(sectionMatch[1])]
              : undefined;
            const icon =
              section?.showSkillIcons ? resolveSkillIcon(run.text) : undefined;
            const iconExtra = icon
              ? SKILL_ICON_SIZE * icon.widthRatio + SKILL_ICON_GAP
              : 0;
            const baselineY = (unscaled.height - run.baseline) * scale;
            const chipCenterY =
              baselineY - SKILL_CHIP_CENTER_ABOVE_BASELINE * scale;
            const halfHeight = (SKILL_CHIP_HALF_HEIGHT - SKILL_CHIP_INSET) *
              scale;
            const top = Math.ceil(chipCenterY - halfHeight);
            const bottom = Math.floor(chipCenterY + halfHeight);
            const left = Math.ceil(
              (run.x - SKILL_CHIP_PAD_X - iconExtra + SKILL_CHIP_INSET) *
                scale,
            );
            const right = Math.floor(
              (run.right + SKILL_CHIP_PAD_X - SKILL_CHIP_INSET) * scale,
            );
            if (right > left && bottom > top) {
              overlay.style.left = `${left}px`;
              overlay.style.width = `${right - left}px`;
              overlay.style.top = `${top}px`;
              overlay.style.height = `${bottom - top}px`;
            }
          }

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
