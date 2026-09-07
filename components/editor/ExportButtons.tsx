"use client";

import { useState, useCallback } from "react";
import { Popover } from "@base-ui/react/popover";
import { Slider } from "@base-ui/react/slider";
import { ChevronDown, Download, FileImage, FileText } from "lucide-react";
import { Button } from "@/components/ui";
import { toPdfBlob } from "@/lib/export/toPdfBlob";
import { toPngBlob } from "@/lib/export/toPngBlob";
import type { ResumeData } from "@/lib/schema/resume";
import "./ExportButtons.css";

const PNG_SCALES = [1, 2, 3, 4, 5] as const;

interface ExportButtonsProps {
  data: ResumeData;
}

/**
 * Single "Export" button that opens a popover with format choices.
 * Takes resume data as a prop — does not reach into any store.
 */
export function ExportButtons({ data }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [pngScale, setPngScale] = useState(2);

  const triggerDownload = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, []);

  const handleExportPdf = useCallback(async () => {
    setIsExporting(true);
    try {
      const blob = await toPdfBlob(data);
      const name = buildExportFilename(data);
      triggerDownload(blob, `${name}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }, [data, triggerDownload]);

  const handleExportPng = useCallback(async () => {
    setIsExporting(true);
    try {
      const blob = await toPngBlob(data, pngScale);
      const name = buildExportFilename(data);
      triggerDownload(blob, `${name}.png`);
    } catch (err) {
      console.error("PNG export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }, [data, pngScale, triggerDownload]);

  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <Button
            variant="secondary"
            size="m"
            className="export-buttons__trigger"
          >
            <Download size={14} />
            Export
            <ChevronDown size={14} className="export-buttons__chevron" />
          </Button>
        }
      />
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end">
          <Popover.Popup className="export-buttons__popup">
            <div className="export-buttons__title">Export As</div>

            <button
              type="button"
              className="export-buttons__option"
              onClick={handleExportPdf}
              disabled={isExporting}
            >
              <span className="export-buttons__option-icon">
                <FileText size={16} />
              </span>
              <span className="export-buttons__option-body">
                <span className="export-buttons__option-label">PDF</span>
                <span className="export-buttons__option-desc">
                  Selectable text, vector graphics
                </span>
              </span>
            </button>

            <div className="export-buttons__separator" />

            <div className="export-buttons__png">
              <button
                type="button"
                className="export-buttons__option"
                onClick={handleExportPng}
                disabled={isExporting}
              >
                <span className="export-buttons__option-icon">
                  <FileImage size={16} />
                </span>
                <span className="export-buttons__option-body">
                  <span className="export-buttons__option-label">PNG</span>
                  <span className="export-buttons__option-desc">
                    High-res image, {pngScale}x resolution
                  </span>
                </span>
              </button>

              <Slider.Root
                className="export-buttons__scale"
                value={pngScale}
                min={1}
                max={5}
                step={1}
                disabled={isExporting}
                thumbAlignment="edge"
                onValueChange={setPngScale}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="export-buttons__scale-header">
                  <Slider.Label className="export-buttons__scale-label">
                    Scale
                  </Slider.Label>
                  <Slider.Value className="export-buttons__scale-value">
                    {(_formatted, values) => `${values[0]}x`}
                  </Slider.Value>
                </div>
                <Slider.Control className="export-buttons__scale-control">
                  <Slider.Track className="export-buttons__scale-track">
                    <Slider.Indicator className="export-buttons__scale-indicator" />
                    <Slider.Thumb className="export-buttons__scale-thumb" />
                  </Slider.Track>
                  <div className="export-buttons__scale-stops" aria-hidden="true">
                    {PNG_SCALES.map((scale) => (
                      <span
                        key={scale}
                        className="export-buttons__scale-stop"
                        data-reached={scale < pngScale ? "" : undefined}
                      />
                    ))}
                  </div>
                </Slider.Control>
                <div className="export-buttons__scale-marks" aria-hidden="true">
                  {PNG_SCALES.map((scale) => (
                    <span
                      key={scale}
                      className="export-buttons__scale-mark"
                      data-current={scale === pngScale ? "" : undefined}
                    >
                      {scale}
                    </span>
                  ))}
                </div>
              </Slider.Root>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]/g;

/** e.g. "ada lovelace" -> "Exabyting-Ada-Lovelace-Resume" */
export function buildExportFilename(data: ResumeData): string {
  const rawName =
    data.personalInfo.fullName?.trim() || data.meta.title?.trim() || "Resume";
  const cleaned = rawName.replace(INVALID_FILENAME_CHARS, "").trim();
  const titleCased = toTitleCase(cleaned) || "Resume";
  const slug = titleCased.replace(/\s+/g, "-");
  return `Exabyting-${slug}-Resume`;
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
