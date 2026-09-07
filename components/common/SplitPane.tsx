"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import "./SplitPane.css";

export interface SplitPaneProps {
  primary: ReactNode;
  secondary: ReactNode;
  defaultPrimaryPercentage?: number; // e.g. 50 (50%)
  minPrimaryPercentage?: number; // default 25
  maxPrimaryPercentage?: number; // default 75
  isPrimaryCollapsed?: boolean;
  isSecondaryCollapsed?: boolean;
  className?: string;
  primaryAriaLabel?: string;
  secondaryAriaLabel?: string;
}

export function SplitPane({
  primary,
  secondary,
  defaultPrimaryPercentage = 50,
  minPrimaryPercentage = 25,
  maxPrimaryPercentage = 75,
  isPrimaryCollapsed = false,
  isSecondaryCollapsed = false,
  className,
  primaryAriaLabel = "Form panel",
  secondaryAriaLabel = "Preview panel",
}: SplitPaneProps) {
  const [percentage, setPercentage] = useState<number>(defaultPrimaryPercentage);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const clampPercentage = useCallback(
    (val: number) => {
      return Math.min(Math.max(val, minPrimaryPercentage), maxPrimaryPercentage);
    },
    [minPrimaryPercentage, maxPrimaryPercentage]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const clientX = e.clientX;
      const newPercentage = ((clientX - rect.left) / rect.width) * 100;
      setPercentage(clampPercentage(newPercentage));
    },
    [isDragging, clampPercentage]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture may already be released
      }
    },
    [isDragging]
  );

  // Keyboard accessibility for resize handle (per AGENTS.md §6.9)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const step = 2; // 2% per arrow press
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPercentage((prev) => clampPercentage(prev - step));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setPercentage((prev) => clampPercentage(prev + step));
      } else if (e.key === "Home") {
        e.preventDefault();
        setPercentage(minPrimaryPercentage);
      } else if (e.key === "End") {
        e.preventDefault();
        setPercentage(maxPrimaryPercentage);
      }
    },
    [clampPercentage, minPrimaryPercentage, maxPrimaryPercentage]
  );

  // Stop dragging if user leaves window or releases mouse outside
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [isDragging]);

  const showResizer = !isPrimaryCollapsed && !isSecondaryCollapsed;

  const containerClasses = [
    "split-pane",
    isDragging && "split-pane--dragging",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const primaryStyle =
    !isPrimaryCollapsed && !isSecondaryCollapsed
      ? { width: `${percentage}%` }
      : undefined;

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className={[
          "split-pane__pane",
          "split-pane__pane--primary",
          isPrimaryCollapsed && "split-pane__pane--collapsed",
        ]
          .filter(Boolean)
          .join(" ")}
        style={primaryStyle}
        aria-label={primaryAriaLabel}
      >
        {primary}
      </div>

      {showResizer && (
        <div
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-valuenow={Math.round(percentage)}
          aria-valuemin={minPrimaryPercentage}
          aria-valuemax={maxPrimaryPercentage}
          aria-label="Resize panels"
          className="split-pane__resizer"
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
        >
          <div className="split-pane__resizer-handle" />
        </div>
      )}

      <div
        className={[
          "split-pane__pane",
          "split-pane__pane--secondary",
          isSecondaryCollapsed && "split-pane__pane--collapsed",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={secondaryAriaLabel}
      >
        {secondary}
      </div>
    </div>
  );
}

export default SplitPane;
