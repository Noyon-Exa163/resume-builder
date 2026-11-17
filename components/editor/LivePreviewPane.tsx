"use client";

import { useEffect, useRef, useState } from "react";
import type { ResumeData } from "@/lib/schema/resume";
import { getCachedPdfBlob, toPdfBlob } from "@/lib/export/toPdfBlob";
import { PdfCanvasViewer } from "./PdfCanvasViewer";
import "./LivePreviewPane.css";

const DEBOUNCE_MS = 400;

interface LivePreviewPaneProps {
  data: ResumeData;
  onPageCountChange?: (pageCount: number) => void;
  /** Bump this after a completed AI/heuristic import lands in `data` — the
   *  next preview render plays a one-shot appear animation instead of
   *  swapping in silently like a routine edit does. */
  celebrateKey?: number;
}

/**
 * Renders the draft through toPdfBlob() — the same path the download uses —
 * so the preview never drifts from the exported file. Debounced so typing
 * doesn't rebuild the whole PDF per keystroke. Rendered blobs are cached by
 * content key so toggling between two states (e.g. undo/redo) reuses the
 * previous render instead of re-rasterising the whole PDF.
 */
export function LivePreviewPane({
  data,
  onPageCountChange,
  celebrateKey,
}: LivePreviewPaneProps) {
  const [draft, setDraft] = useState(() => ({
    key: previewKey(data),
    data,
    appear: false,
  }));
  const [rendered, setRendered] = useState<{
    blob: Blob | null;
    appear: boolean;
  }>({ blob: null, appear: false });

  const lastCelebrateKeyRef = useRef(celebrateKey);
  const pendingCelebrateRef = useRef(false);

  useEffect(() => {
    if (celebrateKey !== lastCelebrateKeyRef.current) {
      lastCelebrateKeyRef.current = celebrateKey;
      pendingCelebrateRef.current = true;
    }
  }, [celebrateKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const key = previewKey(data);
      setDraft((prev) => {
        if (prev.key === key) return prev;
        const appear = pendingCelebrateRef.current;
        pendingCelebrateRef.current = false;
        return { key, data, appear };
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [data]);

  useEffect(() => {
    let isStale = false;
    void getCachedPdfBlob(draft.key, () => toPdfBlob(draft.data))
      .then((next) => {
        if (!isStale) setRendered({ blob: next, appear: draft.appear });
      })
      .catch((error) => console.error("Preview render failed:", error));
    return () => {
      isStale = true;
    };
  }, [draft]);

  return (
    <PdfCanvasViewer
      blob={rendered.blob}
      data={draft.data}
      appear={rendered.appear}
      className="live-preview-pane"
      aria-label="Live preview"
      onPageCountChange={onPageCountChange}
    />
  );
}

/**
 * Identifies the draft by the content that actually reaches the page. Autosave
 * swaps in a fresh, deep-equal object and every edit bumps `meta.updatedAt`,
 * so comparing by reference or including the timestamp would rebuild a PDF
 * that is already on screen.
 */
function previewKey(data: ResumeData): string {
  return JSON.stringify({ ...data, meta: { ...data.meta, updatedAt: null } });
}
