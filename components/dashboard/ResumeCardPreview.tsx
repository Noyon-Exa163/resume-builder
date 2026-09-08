"use client";

import { useEffect, useRef, useState } from "react";
import type { ResumeData } from "@/lib/schema/resume";
import { getResumeThumbnailDataUrl } from "@/lib/export/resumeThumbnail";
import "./ResumeCardPreview.css";

interface ResumeCardPreviewProps {
  data: ResumeData;
}

/**
 * Shows the top of the first resume page, zoomed to fill the card width.
 * Backed by the cached header thumbnail (lib/export/resumeThumbnail.ts) —
 * a resume's summary and sections never appear in this crop, so this only
 * does real rendering work the first time a resume is seen, or after its
 * header (name, headline, contact info, template, page size) changes.
 */
export function ResumeCardPreview({ data }: ResumeCardPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

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
    let isStale = false;

    void getResumeThumbnailDataUrl(data)
      .then((url) => {
        if (!isStale) setDataUrl(url);
      })
      .catch((error) => {
        if (!isStale) console.error("Resume thumbnail render failed:", error);
      });

    return () => {
      isStale = true;
    };
  }, [isVisible, data]);

  return (
    <div className="resume-card-preview" ref={containerRef} aria-hidden="true">
      <div className="resume-card-preview__canvas-host">
        {dataUrl && (
          <img
            className="resume-card-preview__canvas"
            src={dataUrl}
            alt=""
          />
        )}
      </div>
    </div>
  );
}
