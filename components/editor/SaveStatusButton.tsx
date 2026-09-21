"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck, History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { formatDateTime } from "@/lib/utils/formatDateTime";
import "./SaveStatusButton.css";

/** How long the success check stays before returning to the history icon. */
const SUCCESS_VISIBLE_MS = 1500;

type Status = "idle" | "saving" | "saved";

interface SaveStatusButtonProps {
  isSaving: boolean;
  isDirty: boolean;
  lastSavedAt: string | null;
  onClick: () => void;
}

/**
 * History icon that doubles as the save indicator: a spinner while saving,
 * a green check when the save lands, then back to the icon. Hover shows when
 * the resume was last saved; click opens the edit history.
 */
export function SaveStatusButton({
  isSaving,
  isDirty,
  lastSavedAt,
  onClick,
}: SaveStatusButtonProps) {
  const [showSaved, setShowSaved] = useState(false);
  const wasSavingRef = useRef(false);

  useEffect(() => {
    // Falling edge of a save that left nothing unsaved.
    if (wasSavingRef.current && !isSaving && !isDirty) {
      setShowSaved(true);
      const timer = window.setTimeout(
        () => setShowSaved(false),
        SUCCESS_VISIBLE_MS,
      );
      wasSavingRef.current = isSaving;
      return () => window.clearTimeout(timer);
    }
    wasSavingRef.current = isSaving;
  }, [isSaving, isDirty]);

  const status: Status = isSaving ? "saving" : showSaved ? "saved" : "idle";

  const lastSavedLabel = lastSavedAt ? formatDateTime(lastSavedAt) : undefined;
  const tooltip =
    status === "saving"
      ? "Saving…"
      : lastSavedLabel
        ? `Last saved ${lastSavedLabel}`
        : "Not saved yet";

  return (
    <Button
      type="button"
      variant="tertiary"
      size="m"
      iconOnly
      aria-label="Edit History"
      tooltip={tooltip}
      onClick={onClick}
    >
      <span className="save-status" data-status={status}>
        <History size={18} className="save-status__icon save-status__icon--idle" />
        <Loader2
          size={18}
          className="save-status__icon save-status__icon--saving"
        />
        <CircleCheck
          size={18}
          className="save-status__icon save-status__icon--saved"
        />
      </span>
      <span className="save-status__live" role="status">
        {status === "saving" ? "Saving" : status === "saved" ? "Saved" : ""}
      </span>
    </Button>
  );
}
