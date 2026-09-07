"use client";

import { useEffect, useState } from "react";
import { Slider } from "@base-ui/react/slider";
import { Loader2 } from "lucide-react";
import {
  Button,
  DialogPopup,
  DialogRoot,
  SelectField,
  SwitchField,
  type SelectOption,
} from "@/components/ui";
import type { ResumeData } from "@/lib/schema/resume";
import { getPdfPageCount, toPngBlob, toPngBlobAllPages } from "@/lib/export/toPngBlob";
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
 * Opens from the Export popover's "PNG" option. Loads the resume's current
 * page count up front so the scale slider and page picker/all-pages toggle
 * are informed choices rather than a blind export of page 1.
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

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadPageCount() {
      setErrorMessage("");
      setIsLoadingPages(true);
      try {
        const count = await getPdfPageCount(data);
        if (cancelled) return;
        setNumPages(count);
        setSelectedPage((page) => (page > count ? 1 : page));
      } catch {
        if (!cancelled) {
          setErrorMessage("Couldn't read the resume's page count.");
        }
      } finally {
        if (!cancelled) setIsLoadingPages(false);
      }
    }

    void loadPageCount();

    return () => {
      cancelled = true;
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
  const pageOptions: SelectOption[] = numPages
    ? Array.from({ length: numPages }, (_, i) => ({
        value: String(i + 1),
        label: `Page ${i + 1}`,
      }))
    : [];

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogPopup
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
        <div className="png-export-dialog__body">
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
            <Slider.Control className="png-export-dialog__scale-control">
              <Slider.Track className="png-export-dialog__scale-track">
                <Slider.Indicator className="png-export-dialog__scale-indicator" />
                <Slider.Thumb className="png-export-dialog__scale-thumb" />
              </Slider.Track>
              <div className="png-export-dialog__scale-stops" aria-hidden="true">
                {PNG_SCALES.map((s) => (
                  <span
                    key={s}
                    className="png-export-dialog__scale-stop"
                    data-reached={s < scale ? "" : undefined}
                  />
                ))}
              </div>
            </Slider.Control>
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
            <p className="png-export-dialog__loading">Checking page count…</p>
          ) : (
            hasMultiplePages && (
              <div className="png-export-dialog__pages">
                <SwitchField
                  checked={exportAllPages}
                  onCheckedChange={setExportAllPages}
                  label="Export all pages as one image"
                />
                {!exportAllPages && (
                  <SelectField
                    label="Page"
                    size="s"
                    options={pageOptions}
                    value={String(selectedPage)}
                    onValueChange={(value) => {
                      if (value) setSelectedPage(Number(value));
                    }}
                  />
                )}
              </div>
            )
          )}

          {errorMessage && (
            <div className="png-export-dialog__error">{errorMessage}</div>
          )}
        </div>
      </DialogPopup>
    </DialogRoot>
  );
}
