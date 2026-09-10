"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { Slider } from "@base-ui/react/slider";
import { Loader2 } from "lucide-react";
import {
  Button,
  DialogPopup,
  DialogRoot,
  Skeleton,
  SwitchField,
} from "@/components/ui";
import type { ResumeData } from "@/lib/schema/resume";
import { toPngBlob, toPngBlobAllPages } from "@/lib/export/toPngBlob";
import { captureLivePreviewPages } from "./captureLivePreviewPages";
import "./PngExportDialog.css";

const PNG_SCALES = [1, 2, 3, 4, 5] as const;

export interface PngExportDialogProps {
  data: ResumeData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the rendered PNG and a filename suffix (e.g. "-page-2",
   * or "" for a single-page resume or the all-pages export) — the caller
   * owns naming/downloading, this dialog only produces the image. */
  onExport: (blob: Blob, filenameSuffix: string) => void;
}

/**
 * Opens from the Export popover's "PNG" option. Previews the resume as
 * snapshots of the live preview so toggling pages never re-rasterizes a PDF.
 */
export function PngExportDialog({
  data,
  open,
  onOpenChange,
  onExport,
}: PngExportDialogProps) {
  const [scale, setScale] = useState(2);
  const [exportAllPages, setExportAllPages] = useState(false);
  const [selectedPage, setSelectedPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pageImages, setPageImages] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      const reset = () => {
        setPageImages([]);
        setNumPages(null);
      };
      reset();
      return;
    }

    let cancelled = false;
    const created: string[] = [];

    async function loadPreview() {
      setErrorMessage("");
      setIsLoadingPages(true);
      try {
        const urls = await captureLivePreviewPages();
        if (cancelled) {
          urls.forEach((url) => URL.revokeObjectURL(url));
          return;
        }
        created.push(...urls);
        setPageImages(urls);
        setNumPages(urls.length);
        setSelectedPage((page) => (page > urls.length ? 1 : page));
      } catch {
        if (!cancelled) {
          setErrorMessage("Couldn't capture a preview.");
        }
      } finally {
        if (!cancelled) setIsLoadingPages(false);
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [open, data]);

  async function handleExport() {
    setErrorMessage("");
    setIsExporting(true);
    try {
      const hasMultiplePages = (numPages ?? 0) > 1;
      const blob =
        exportAllPages && hasMultiplePages
          ? await toPngBlobAllPages(data, scale)
          : await toPngBlob(data, scale, selectedPage);
      const suffix =
        !exportAllPages && hasMultiplePages ? `-page-${selectedPage}` : "";
      onExport(blob, suffix);
      onOpenChange(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "PNG export failed.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  const hasMultiplePages = (numPages ?? 0) > 1;
  const showAllPages = exportAllPages && hasMultiplePages;

  function handlePageListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!numPages) return;

    let next = selectedPage;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = Math.min(selectedPage + 1, numPages);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = Math.max(selectedPage - 1, 1);
    } else if (event.key === "Home") {
      next = 1;
    } else if (event.key === "End") {
      next = numPages;
    } else {
      return;
    }

    event.preventDefault();
    setSelectedPage(next);
    const button = event.currentTarget.querySelector<HTMLButtonElement>(
      `[data-page="${next}"]`,
    );
    button?.focus();
  }

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogPopup
        className="png-export-dialog"
        title="Export as PNG"
        description="Choose a resolution and which page to export."
        footer={
          <Button
            type="button"
            variant="primary"
            size="m"
            disabled={isExporting || isLoadingPages}
            onClick={() => void handleExport()}
          >
            {isExporting && <Loader2 size={16} className="button__icon--spin" />}
            {isExporting ? "Exporting…" : "Export PNG"}
          </Button>
        }
      >
        <div className="png-export-dialog__layout">
          <div className="png-export-dialog__preview-col">
            <div
              className={[
                "png-export-dialog__preview",
                showAllPages
                  ? "png-export-dialog__preview--scroll"
                  : "png-export-dialog__preview--page",
              ].join(" ")}
            >
              {pageImages.length > 0 ? (
                <div
                  className="png-export-dialog__images"
                  role="region"
                  aria-label="PNG export preview"
                >
                  {pageImages.map((url, index) => {
                    const page = index + 1;
                    const isActive = showAllPages || selectedPage === page;
                    return (
                      <img
                        key={url}
                        src={url}
                        alt={`Page ${page}`}
                        data-page={page}
                        data-active={isActive ? "" : undefined}
                        className="png-export-dialog__image"
                      />
                    );
                  })}
                </div>
              ) : (
                <Skeleton radius="md" className="png-export-dialog__preview-skeleton" />
              )}
            </div>
            {numPages != null && (
              <p className="png-export-dialog__page-count">
                {numPages} {numPages === 1 ? "Page" : "Pages"}
              </p>
            )}
          </div>

          <div className="png-export-dialog__controls">
            <Slider.Root
              className="png-export-dialog__scale"
              value={scale}
              min={1}
              max={5}
              step={1}
              disabled={isExporting}
              thumbAlignment="edge"
              onValueChange={setScale}
            >
              <div className="png-export-dialog__scale-header">
                <Slider.Label className="png-export-dialog__scale-label">
                  Scale
                </Slider.Label>
                <Slider.Value className="png-export-dialog__scale-value">
                  {(_formatted, values) => `${values[0]}x`}
                </Slider.Value>
              </div>
              <div className="png-export-dialog__scale-rail">
                <Slider.Control className="png-export-dialog__scale-control">
                  <Slider.Track className="png-export-dialog__scale-track">
                    <Slider.Indicator className="png-export-dialog__scale-indicator" />
                    <Slider.Thumb className="png-export-dialog__scale-thumb" />
                  </Slider.Track>
                </Slider.Control>
                <div className="png-export-dialog__scale-stops" aria-hidden="true">
                  {PNG_SCALES.map((s) => (
                    <span key={s} className="png-export-dialog__scale-stop">
                      <span
                        className="png-export-dialog__scale-bar"
                        data-active={s <= scale ? "" : undefined}
                      />
                    </span>
                  ))}
                </div>
              </div>
              <div className="png-export-dialog__scale-marks" aria-hidden="true">
                {PNG_SCALES.map((s) => (
                  <span
                    key={s}
                    className="png-export-dialog__scale-mark"
                    data-current={s === scale ? "" : undefined}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </Slider.Root>

            {isLoadingPages ? (
              <p className="png-export-dialog__loading">Preparing preview…</p>
            ) : (
              hasMultiplePages && (
                <div className="png-export-dialog__pages">
                  <SwitchField
                    checked={exportAllPages}
                    onCheckedChange={setExportAllPages}
                    label={`Export all ${numPages} pages as one image`}
                  />
                  {!exportAllPages && (
                    <div className="png-export-dialog__page-picker">
                      <span className="png-export-dialog__page-label" id="png-export-page-label">
                        Page
                      </span>
                      <div
                        className="png-export-dialog__page-list"
                        role="radiogroup"
                        aria-labelledby="png-export-page-label"
                        onKeyDown={handlePageListKeyDown}
                      >
                        {Array.from({ length: numPages ?? 0 }, (_, i) => {
                          const page = i + 1;
                          const checked = selectedPage === page;
                          return (
                            <button
                              key={page}
                              type="button"
                              role="radio"
                              data-page={page}
                              data-active={checked ? "" : undefined}
                              aria-checked={checked}
                              tabIndex={checked ? 0 : -1}
                              className="png-export-dialog__page-choice"
                              disabled={isExporting}
                              onClick={() => setSelectedPage(page)}
                            >
                              {page}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

            {errorMessage && (
              <div className="png-export-dialog__error">{errorMessage}</div>
            )}
          </div>
        </div>
      </DialogPopup>
    </DialogRoot>
  );
}
