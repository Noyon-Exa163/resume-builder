"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { FilePlus, Loader2, UploadCloud, X } from "lucide-react";
import {
  Button,
  DialogPopup,
  DialogRoot,
  Textarea,
  Tooltip,
} from "@/components/ui";
import { createBlankResume } from "@/lib/schema/normalize";
import { fetchDefaultTemplateId } from "@/lib/storage/api/appDefaults";
import { resumeRepository } from "@/lib/storage/api/resumeRepository";
import { pendingImportRepository } from "@/lib/storage/pendingImport/pendingImportRepository";
import {
  ACCEPTED_IMPORT_EXTENSIONS,
  detectFormat,
} from "@/lib/import/detectFormat";
import { truncateFilenameMiddle } from "@/lib/utils/truncateFilename";
import "./NewResumeDialog.css";

export interface NewResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Awaited before creating the new resume — e.g. the editor passes its
   *  own `save()` so the resume being left is persisted first. The
   *  dashboard has no outgoing resume to save, so it omits this. */
  beforeCreate?: () => Promise<void> | void;
}

const ACCEPTED_EXTENSIONS = ACCEPTED_IMPORT_EXTENSIONS.join(",");
const CHIP_NAME_MAX_LENGTH = 40;

/**
 * Entry point for creating a resume, opened by every "New Resume" button
 * (dashboard and editor). A dropped/picked file and an optional prompt hand
 * off to the new resume's AI chat, which sends them automatically on
 * arrival (see pendingImportRepository and AiChatPanel's pending-import
 * effect) — "Start From Blank" skips that entirely.
 */
export function NewResumeDialog({
  open,
  onOpenChange,
  beforeCreate,
}: NewResumeDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setFile(null);
    setPrompt("");
    setError("");
    setIsDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(next: boolean) {
    if (isCreating) return;
    if (!next) reset();
    onOpenChange(next);
  }

  function pickFile(candidate: File) {
    if (detectFormat(candidate) === "unknown") {
      setError(
        "Unsupported file type. Upload a PDF, DOCX, an image (PNG, JPG, WebP, AVIF), Markdown, or a previously exported .json project file.",
      );
      return;
    }
    setError("");
    setFile(candidate);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) pickFile(dropped);
  }

  /** Shared by both paths — only what happens after differs. */
  async function createBlankAndNavigate(): Promise<string> {
    // Independent of each other — fetching the new resume's template and
    // saving the one being left (if the caller passed beforeCreate) don't
    // depend on one another, so run them together.
    const [templateId] = await Promise.all([
      fetchDefaultTemplateId(),
      beforeCreate?.(),
    ]);
    const blank = createBlankResume(templateId);
    await resumeRepository.set(blank.meta.id, blank);
    return blank.meta.id;
  }

  async function handleStartBlank() {
    setIsCreating(true);
    try {
      const id = await createBlankAndNavigate();
      onOpenChange(false);
      router.push(`/editor/${id}`);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCreate() {
    const trimmedPrompt = prompt.trim();
    if (!file && !trimmedPrompt) return;
    setIsCreating(true);
    try {
      const id = await createBlankAndNavigate();
      await pendingImportRepository.set(id, {
        file: file ?? undefined,
        prompt: trimmedPrompt || undefined,
      });
      onOpenChange(false);
      router.push(`/editor/${id}`);
    } finally {
      setIsCreating(false);
    }
  }

  const canCreate = Boolean(file) || prompt.trim().length > 0;

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <DialogPopup
        className="new-resume-dialog"
        title="Start a New Resume"
        description="Upload an existing resume and we'll fill in your details automatically, or start from a blank page."
        footer={
          <>
            <Button
              type="button"
              variant="tertiary"
              size="m"
              className="new-resume-dialog__blank-button"
              disabled={isCreating}
              onClick={() => void handleStartBlank()}
            >
              Start From Blank
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="m"
              disabled={isCreating}
              onClick={() => handleOpenChange(false)}
            >
              <X size={16} />
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="m"
              disabled={isCreating || !canCreate}
              onClick={() => void handleCreate()}
            >
              {isCreating ? (
                <Loader2 size={16} className="button__icon--spin" />
              ) : (
                <FilePlus size={16} />
              )}
              {isCreating ? "Creating…" : "Create Resume"}
            </Button>
          </>
        }
      >
        <div className="new-resume-dialog__body">
          <div
            className={[
              "new-resume-dialog__dropzone",
              isDragging && "new-resume-dialog__dropzone--dragging",
            ]
              .filter(Boolean)
              .join(" ")}
            role="button"
            tabIndex={0}
            aria-label="Upload a Resume File"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {file ? (
              <span className="new-resume-dialog__chip">
                <FilePlus size={16} />
                <span
                  className="new-resume-dialog__chip-name"
                  title={file.name}
                >
                  {truncateFilenameMiddle(file.name, CHIP_NAME_MAX_LENGTH)}
                </span>
                <Tooltip label="Remove File">
                  <button
                    type="button"
                    className="new-resume-dialog__chip-remove"
                    aria-label="Remove File"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    <X size={14} />
                  </button>
                </Tooltip>
              </span>
            ) : (
              <>
                <UploadCloud
                  size={28}
                  className="new-resume-dialog__dropzone-icon"
                  aria-hidden="true"
                />
                <span className="new-resume-dialog__dropzone-text">
                  Drag and drop a file, or click to browse
                </span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="new-resume-dialog__file-input"
              accept={ACCEPTED_EXTENSIONS}
              tabIndex={-1}
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) pickFile(picked);
              }}
            />
          </div>

          {error && <span className="new-resume-dialog__error">{error}</span>}

          <Textarea
            label="Add Instructions (Optional)"
            placeholder="E.g. Focus on their last two jobs, or write a summary for a product manager role."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
          />
        </div>
      </DialogPopup>
    </DialogRoot>
  );
}

export default NewResumeDialog;
