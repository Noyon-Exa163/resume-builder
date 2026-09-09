"use client";

import {
  GalleryThumbnails,
  Maximize2,
  UnfoldHorizontal,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui";
import type { PreviewMode } from "./previewLayout";
import { ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN } from "./previewLayout";
import "./PreviewZoomToolbar.css";

interface PreviewZoomToolbarProps {
  mode: PreviewMode;
  zoomPercent: number;
  onModeChange: (mode: PreviewMode) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

const MODE_BUTTONS: {
  mode: PreviewMode;
  label: string;
  icon: typeof UnfoldHorizontal;
}[] = [
  { mode: "fill-width", label: "Fill Width", icon: UnfoldHorizontal },
  { mode: "fit", label: "Fit", icon: Maximize2 },
  { mode: "view-all", label: "View All", icon: GalleryThumbnails },
];

/**
 * Floating preview controls. Positioned by its own CSS against a
 * `position: relative` preview pane — not `fixed`, so it tracks the pane
 * when the editor split is dragged.
 */
export function PreviewZoomToolbar({
  mode,
  zoomPercent,
  onModeChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: PreviewZoomToolbarProps) {
  const zoomEnabled = mode !== "view-all";
  const canResetZoom = zoomPercent !== ZOOM_DEFAULT;
  const zoomDisabledTitle = zoomEnabled
    ? undefined
    : "Zoom isn't available in View All.";

  return (
    <div
      className="preview-zoom-toolbar"
      role="toolbar"
      aria-label="Preview Zoom"
    >
      <div className="preview-zoom-toolbar__group">
        <Button
          type="button"
          variant="tertiary"
          size="m"
          iconOnly
          aria-label="Zoom Out"
          title={zoomDisabledTitle}
          disabled={!zoomEnabled || zoomPercent <= ZOOM_MIN}
          onClick={onZoomOut}
        >
          <ZoomOut size={18} />
        </Button>
        <Button
          type="button"
          variant="tertiary"
          size="m"
          aria-label="Reset Zoom"
          aria-live="polite"
          aria-atomic="true"
          title={zoomDisabledTitle}
          disabled={!zoomEnabled || !canResetZoom}
          className="preview-zoom-toolbar__level"
          onClick={onZoomReset}
        >
          {zoomPercent}%
        </Button>
        <Button
          type="button"
          variant="tertiary"
          size="m"
          iconOnly
          aria-label="Zoom In"
          title={zoomDisabledTitle}
          disabled={!zoomEnabled || zoomPercent >= ZOOM_MAX}
          onClick={onZoomIn}
        >
          <ZoomIn size={18} />
        </Button>
      </div>
      <span className="preview-zoom-toolbar__divider" />
      <div
        className="preview-zoom-toolbar__group"
        role="group"
        aria-label="Preview Mode"
      >
        {MODE_BUTTONS.map(({ mode: value, label, icon: Icon }) => (
          <Button
            key={value}
            type="button"
            variant="tertiary"
            size="m"
            iconOnly
            aria-label={label}
            aria-pressed={mode === value}
            className="preview-zoom-toolbar__mode"
            onClick={() => onModeChange(value)}
          >
            <Icon size={18} />
          </Button>
        ))}
      </div>
    </div>
  );
}
