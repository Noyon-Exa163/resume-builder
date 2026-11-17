"use client";

import { useCallback, useEffect, useRef } from "react";
import { EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui";
import "./AlternatePhoneCard.css";

export interface AlternatePhoneCardProps {
  /** Container-relative position; sized to the clicked number's run with a
   *  readability floor applied by the caller. */
  top: number;
  left: number;
  width: number;
  onHide: () => void;
  onClose: () => void;
}

/**
 * Explains the fixed system alternate phone number when it is clicked on
 * the preview and offers to hide it. The number itself is company data —
 * it isn't stored in the resume, so it can't be text-edited like other
 * fields; visibility is the editable part (meta.alternatePhoneVisible).
 */
export function AlternatePhoneCard({
  top,
  left,
  width,
  onHide,
  onClose,
}: AlternatePhoneCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Clicking anywhere outside closes, mirroring the inline editor.
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const hide = useCallback(() => {
    onHide();
    onClose();
  }, [onHide, onClose]);

  return (
    <div
      ref={cardRef}
      className="alternate-phone-card"
      style={{ top: `${top}px`, left: `${left}px`, width: `${width}px` }}
      role="dialog"
      aria-label="System contact number"
    >
      <button
        type="button"
        className="alternate-phone-card__close"
        onClick={onClose}
        aria-label="Close"
      >
        <X size={14} />
      </button>
      <p className="alternate-phone-card__message">
        This is Exabyting&rsquo;s fixed alternate contact number. It isn&rsquo;t
        stored in your resume, so it can&rsquo;t be edited — but you can hide
        it.
      </p>
      <Button
        type="button"
        variant="secondary"
        size="s"
        onClick={hide}
        className="alternate-phone-card__hide"
      >
        <EyeOff size={14} />
        Hide This Number
      </Button>
    </div>
  );
}
