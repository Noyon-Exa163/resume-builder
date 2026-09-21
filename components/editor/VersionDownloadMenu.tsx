"use client";

import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { Download, FileCode, FileJson, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { toPdfBlob } from "@/lib/export/toPdfBlob";
import { toMarkdown } from "@/lib/export/toMarkdown";
import { toJsonBlob } from "@/lib/export/toJson";
import { buildExportFilename } from "@/lib/export/filename";
import { triggerDownload } from "@/lib/export/triggerDownload";
import { getResumeVersion } from "@/lib/storage/api/resumeHistory";
import "./VersionDownloadMenu.css";

type Format = "json" | "pdf" | "markdown";

const FORMATS: { format: Format; label: string; icon: typeof FileText }[] = [
  { format: "json", label: "JSON", icon: FileJson },
  { format: "pdf", label: "PDF", icon: FileText },
  { format: "markdown", label: "Markdown", icon: FileCode },
];

interface VersionDownloadMenuProps {
  resumeId: string;
  versionId: string;
  versionNumber: number;
  onError: (message: string) => void;
}

/** Icon button that downloads one saved version as JSON, PDF or Markdown. */
export function VersionDownloadMenu({
  resumeId,
  versionId,
  versionNumber,
  onError,
}: VersionDownloadMenuProps) {
  const [isBusy, setIsBusy] = useState(false);

  async function handleDownload(format: Format) {
    setIsBusy(true);
    try {
      const data = await getResumeVersion(resumeId, versionId);
      const name = `${buildExportFilename(data)}-V${versionNumber}`;
      if (format === "json") {
        triggerDownload(toJsonBlob(data), `${name}.json`);
      } else if (format === "markdown") {
        const blob = new Blob([toMarkdown(data)], {
          type: "text/markdown;charset=utf-8",
        });
        triggerDownload(blob, `${name}.md`);
      } else {
        triggerDownload(await toPdfBlob(data), `${name}.pdf`);
      }
    } catch (error) {
      console.error("Version download failed:", error);
      onError(
        error instanceof Error
          ? error.message
          : "Could not download that version. Please try again.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        disabled={isBusy}
        render={
          <Button
            type="button"
            variant="tertiary"
            size="s"
            iconOnly
            aria-label="Download Version"
            tooltip="Download"
          >
            {isBusy ? (
              <Loader2 size={16} className="button__icon--spin" />
            ) : (
              <Download size={16} />
            )}
          </Button>
        }
      />
      <Menu.Portal>
        <Menu.Positioner
          className="version-menu__positioner"
          side="bottom"
          align="end"
          sideOffset={4}
        >
          <Menu.Popup className="version-menu__popup">
            {FORMATS.map(({ format, label, icon: Icon }) => (
              <Menu.Item
                key={format}
                className="version-menu__item"
                onClick={() => void handleDownload(format)}
              >
                <Icon size={16} />
                {label}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
