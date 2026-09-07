"use client";

import { useEffect, useRef, useState } from "react";
import type { ResumeData } from "@/lib/schema/resume";
import { toPdfBlob } from "@/lib/export/toPdfBlob";
import { getPdfjs } from "@/lib/pdf/pdfjs";
import "./ResumeCardPreview.css";

interface ResumeCardPreviewProps {
  data: ResumeData;
}

/**
 * Renders the top of the first resume page, zoomed to fill the card width.
 * The grey frame keeps a 24px gap above and beside the document; the rest is clipped.
 */
export function ResumeCardPreview({ data }: ResumeCardPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const host = canvasHostRef.current;
    if (!host) return;

    let isStale = false;
    const contentWidth = host.clientWidth;
    if (contentWidth <= 0) return;

    void (async () => {
      try {
        const blob = await toPdfBlob(data);
        if (isStale) return;

        const pdfjs = await getPdfjs();
        const pdfData = await blob.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: pdfData });

        try {
          const pdfDoc = await loadingTask.promise;
          if (isStale) return;

          const page = await pdfDoc.getPage(1);
          const unscaled = page.getViewport({ scale: 1 });
          const scale = contentWidth / unscaled.width;
          const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
          const viewport = page.getViewport({ scale: scale * pixelRatio });
          const cssWidth = contentWidth;
          const cssHeight = unscaled.height * scale;

          const canvas = document.createElement("canvas");
          canvas.className = "resume-card-preview__canvas";
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${Math.floor(cssWidth)}px`;
          canvas.style.height = `${Math.floor(cssHeight)}px`;

          const context = canvas.getContext("2d");
          if (!context) return;

          await page.render({ canvas, canvasContext: context, viewport }).promise;
          if (isStale) return;

          host.replaceChildren(canvas);
        } finally {
          void loadingTask.destroy();
        }
      } catch (error) {
        if (!isStale) {
          console.error("Resume thumbnail render failed:", error);
        }
      }
    })();

    return () => {
      isStale = true;
    };
  }, [isVisible, data]);

  return (
    <div className="resume-card-preview" ref={containerRef} aria-hidden="true">
      <div className="resume-card-preview__canvas-host" ref={canvasHostRef} />
    </div>
  );
}
