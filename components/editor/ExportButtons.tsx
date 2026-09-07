"use client";

import { useState, useCallback } from "react";
import { Popover } from "@base-ui/react/popover";
import { Download, FileImage, FileText } from "lucide-react";
import { Button } from "@/components/ui";
import { toPdfBlob } from "@/lib/export/toPdfBlob";
import { toPngBlob } from "@/lib/export/toPngBlob";
import type { ResumeData } from "@/lib/schema/resume";
import "./ExportButtons.css";

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
      const name = sanitizeFilename(data.meta.title);
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
      const name = sanitizeFilename(data.meta.title);
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
          <Button variant="secondary" size="s" className="export-buttons__trigger">
            <Download size={14} />
            Export
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
                <div className="export-buttons__option-row">
                  <span className="export-buttons__option-label">PNG</span>
                  <div className="export-buttons__scale">
                    <label
                      className="export-buttons__scale-label"
                      htmlFor="export-png-scale"
                    >
                      Scale
                    </label>
                    <input
                      id="export-png-scale"
                      className="export-buttons__scale-input"
                      type="number"
                      min={2}
                      max={5}
                      step={1}
                      value={pngScale}
                      onChange={(e) => setPngScale(Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                <span className="export-buttons__option-desc">
                  High-res image, {pngScale}x resolution
                </span>
              </span>
            </button>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function sanitizeFilename(title: string): string {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "resume"
  );
}
