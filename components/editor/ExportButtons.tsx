"use client";

import { useCallback, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import {
  ChevronDown,
  Download,
  FileCode,
  FileImage,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui";
import { toPdfBlob } from "@/lib/export/toPdfBlob";
import { toMarkdown } from "@/lib/export/toMarkdown";
import { buildExportFilename } from "@/lib/export/filename";
import { triggerDownload } from "@/lib/export/triggerDownload";
import type { ResumeData } from "@/lib/schema/resume";
import { PngExportDialog } from "./PngExportDialog";
import "./ExportButtons.css";

interface ExportButtonsProps {
  data: ResumeData;
}

/**
 * Single "Export" button that opens a popover with format choices.
 * Takes resume data as a prop — does not reach into any store.
 */
export function ExportButtons({ data }: ExportButtonsProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPngDialogOpen, setIsPngDialogOpen] = useState(false);

  const handleExportPdf = useCallback(async () => {
    setIsExportingPdf(true);
    try {
      const blob = await toPdfBlob(data);
      const name = buildExportFilename(data);
      triggerDownload(blob, `${name}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setIsExportingPdf(false);
    }
  }, [data]);

  const handleExportMarkdown = useCallback(() => {
    const markdown = toMarkdown(data);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const name = buildExportFilename(data);
    triggerDownload(blob, `${name}.md`);
    setIsMenuOpen(false);
  }, [data]);

  function handleOpenPngDialog() {
    setIsMenuOpen(false);
    setIsPngDialogOpen(true);
  }

  function handlePngExported(blob: Blob, filenameSuffix: string) {
    const name = buildExportFilename(data);
    triggerDownload(blob, `${name}${filenameSuffix}.png`);
  }

  return (
    <>
      <Popover.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
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
          <Popover.Positioner
            className="export-buttons__positioner"
            sideOffset={8}
            align="end"
          >
            <Popover.Popup className="export-buttons__popup">
              <div className="export-buttons__title">Export As</div>

              <button
                type="button"
                className="export-buttons__option"
                onClick={() => void handleExportPdf()}
                disabled={isExportingPdf}
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
                onClick={handleExportMarkdown}
              >
                <span className="export-buttons__option-icon">
                  <FileCode size={16} />
                </span>
                <span className="export-buttons__option-body">
                  <span className="export-buttons__option-label">
                    Markdown
                  </span>
                  <span className="export-buttons__option-desc">
                    Plain text, no images
                  </span>
                </span>
              </button>

              <div className="export-buttons__separator" />

              <button
                type="button"
                className="export-buttons__option"
                onClick={handleOpenPngDialog}
              >
                <span className="export-buttons__option-icon">
                  <FileImage size={16} />
                </span>
                <span className="export-buttons__option-body">
                  <span className="export-buttons__option-label">PNG</span>
                  <span className="export-buttons__option-desc">
                    Choose scale and page…
                  </span>
                </span>
              </button>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>

      <PngExportDialog
        data={data}
        open={isPngDialogOpen}
        onOpenChange={setIsPngDialogOpen}
        onExport={handlePngExported}
      />
    </>
  );
}
