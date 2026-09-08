"use client";

import { useEffect, useRef, useState } from "react";
import type { ResumeData } from "@/lib/schema/resume";
import {
  computeThumbnailKey,
  getResumeThumbnailDataUrl,
} from "@/lib/export/resumeThumbnail";
import "./ResumeCardPreview.css";

interface ResumeCardPreviewProps {
  data: ResumeData;
}

/**
 * Shows the top of page 1 (header and summary), zoomed to fill the card
 * width. Backed by the cached header+summary thumbnail — sections never
 * appear in this crop, so this only does real rendering work the first
 * time a resume is seen, or after its header, summary, template, or page
 * size changes.
 */
export function ResumeCardPreview({ data }: ResumeCardPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const contentKey = computeThumbnailKey(data);

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
    // data is read for the fetch; contentKey is the cache fingerprint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, contentKey]);

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
