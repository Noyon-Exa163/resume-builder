"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { ResumeData } from "@/lib/schema/resume";
import { getTemplate } from "@/templates";
import "./LivePreviewPane.css";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false },
);

const DEBOUNCE_MS = 400;

interface LivePreviewPaneProps {
  data: ResumeData;
}

/**
 * Renders the draft through its template's `Document` component — the same
 * component export.toPdfBlob() uses — so the preview never drifts from the
 * download. Debounced so typing doesn't re-render the whole PDF per keystroke.
 */
export function LivePreviewPane({ data }: LivePreviewPaneProps) {
  const [debounced, setDebounced] = useState(data);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(data), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [data]);

  const { Document } = getTemplate(debounced.meta.templateId);

  return (
    <div className="live-preview-pane">
      <PDFViewer className="live-preview-pane__viewer" showToolbar={false}>
        <Document data={debounced} />
      </PDFViewer>
    </div>
  );
}
