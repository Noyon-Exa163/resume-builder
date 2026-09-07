"use client";

import { useEffect, useState } from "react";
import type { ResumeData } from "@/lib/schema/resume";
import { toPdfBlob } from "@/lib/export/toPdfBlob";
import { PdfCanvasViewer } from "./PdfCanvasViewer";
import "./LivePreviewPane.css";

const DEBOUNCE_MS = 400;

interface LivePreviewPaneProps {
  data: ResumeData;
}

/**
 * Renders the draft through toPdfBlob() — the same path the download uses —
 * so the preview never drifts from the exported file. Debounced so typing
 * doesn't rebuild the whole PDF per keystroke.
 */
export function LivePreviewPane({ data }: LivePreviewPaneProps) {
  const [draft, setDraft] = useState(() => ({ key: previewKey(data), data }));
  const [blob, setBlob] = useState<Blob | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const key = previewKey(data);
      setDraft((prev) => (prev.key === key ? prev : { key, data }));
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [data]);

  useEffect(() => {
    let isStale = false;
    toPdfBlob(draft.data)
      .then((next) => {
        if (!isStale) setBlob(next);
      })
      .catch((error) => console.error("Preview render failed:", error));
    return () => {
      isStale = true;
    };
  }, [draft]);

  return (
    <div className="live-preview-pane">
      <PdfCanvasViewer blob={blob} className="live-preview-pane__viewer" />
    </div>
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
