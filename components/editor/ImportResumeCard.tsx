"use client";

import { useRef, useState, type DragEvent } from "react";
import { Loader2, RefreshCw, Sparkles, Upload } from "lucide-react";
import { Button, Textarea, ConfirmDialog } from "@/components/ui";
import type { ResumeData } from "@/lib/schema/resume";
import type { DeepPartial } from "@/lib/schema/normalize";
import { detectFormat } from "@/lib/import/detectFormat";
import { extractPdfText } from "@/lib/import/extractors/pdfText";
import { extractDocxText } from "@/lib/import/extractors/docxText";
import { extractMarkdownText } from "@/lib/import/extractors/markdownText";
import { parseResumeWithAi } from "@/lib/import/aiParser";
import "./ImportResumeCard.css";

type Status = "idle" | "reading" | "extracting";

const ACCEPTED_EXTENSIONS = ".pdf,.docx,.md,.markdown,.txt,.json";

export interface ImportResumeCardProps {
  /** Whether the currently-open resume already has content, worth confirming
   * before overwriting it. */
  hasExistingContent: boolean;
  onImport: (partial: DeepPartial<ResumeData>) => void;
  className?: string;
}

/**
 * The primary way to build a resume: hand it a PDF/DOCX/Markdown file (or a
 * previously exported .json project file) and either send it to the admin's
 * configured AI provider for extraction, or — for .json — apply it directly,
 * since it's already a full ResumeData this app produced.
 */
export function ImportResumeCard({
  hasExistingContent,
  onImport,
  className,
}: ImportResumeCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [customInstruction, setCustomInstruction] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [pendingPartial, setPendingPartial] =
    useState<DeepPartial<ResumeData> | null>(null);

  function commit(partial: DeepPartial<ResumeData>) {
    try {
      onImport(partial);
      setFile(null);
      setCustomInstruction("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setErrorMessage(
        "Couldn't read this file as a resume — try a different file, or fill the form in manually.",
      );
    }
  }

  function applyOrConfirm(partial: DeepPartial<ResumeData>) {
    if (hasExistingContent) {
      setPendingPartial(partial);
      return;
    }
    commit(partial);
  }

  async function handleExtract() {
    if (!file) return;
    setErrorMessage("");

    const format = detectFormat(file);
    if (format === "unknown") {
      setErrorMessage(
        "Unsupported file type. Upload a PDF, DOCX, Markdown, or a previously exported .json project file.",
      );
      return;
    }

    try {
      if (format === "json") {
        setStatus("reading");
        const parsed = JSON.parse(await file.text()) as DeepPartial<ResumeData>;
        applyOrConfirm(parsed);
        return;
      }

      setStatus("reading");
      const rawText = await extractText(file, format);
      if (!rawText.trim()) {
        setErrorMessage("Couldn't find any readable text in that file.");
        return;
      }

      setStatus("extracting");
      const { json } = await parseResumeWithAi(
        rawText,
        customInstruction.trim() || undefined,
      );
      applyOrConfirm(json as DeepPartial<ResumeData>);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong reading that file.",
      );
    } finally {
      setStatus("idle");
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  const isBusy = status !== "idle";
  const canRetry = Boolean(errorMessage) && !isBusy;
  const buttonLabel =
    status === "reading"
      ? "Reading file…"
      : status === "extracting"
        ? "Extracting with AI…"
        : canRetry
          ? "Retry"
          : "Extract & Fill Resume";

  return (
    <div className={["import-resume-card", className].filter(Boolean).join(" ")}>
      <div className="import-resume-card__header">
        <Sparkles size={20} className="import-resume-card__icon" />
        <div>
          <h2 className="import-resume-card__title">
            Build Your Resume with AI
          </h2>
          <p className="import-resume-card__description">
            Upload a PDF, Word document, or Markdown file — AI will read it
            and fill in the form below automatically.
          </p>
        </div>
      </div>

      <div
        className={[
          "import-resume-card__dropzone",
          isDragging && "import-resume-card__dropzone--active",
        ]
          .filter(Boolean)
          .join(" ")}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <Upload size={18} className="import-resume-card__dropzone-icon" />
        <span className="import-resume-card__dropzone-text">
          {file ? file.name : "Drag a file here, or"}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="s"
          onClick={() => fileInputRef.current?.click()}
        >
          Choose File
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="import-resume-card__file-input"
          accept={ACCEPTED_EXTENSIONS}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <Textarea
        label="Additional instructions (optional)"
        size="s"
        rows={2}
        placeholder="e.g. Focus on my most recent three jobs."
        value={customInstruction}
        onChange={(e) => setCustomInstruction(e.target.value)}
      />

      {errorMessage && (
        <div className="import-resume-card__error">{errorMessage}</div>
      )}

      <Button
        type="button"
        variant="primary"
        size="m"
        disabled={!file || isBusy}
        onClick={() => void handleExtract()}
      >
        {isBusy ? (
          <Loader2 size={16} className="button__icon--spin" />
        ) : canRetry ? (
          <RefreshCw size={16} />
        ) : (
          <Sparkles size={16} />
        )}
        {buttonLabel}
      </Button>

      <ConfirmDialog
        open={pendingPartial !== null}
        onOpenChange={(open) => {
          if (!open) setPendingPartial(null);
        }}
        title="Replace current content?"
        description="This will replace the personal info, summary, and sections below with the imported file's content."
        confirmLabel="Replace"
        isDestructive={false}
        onConfirm={() => {
          if (pendingPartial) commit(pendingPartial);
        }}
      />
    </div>
  );
}

async function extractText(
  file: File,
  format: "pdf" | "docx" | "markdown" | "text",
): Promise<string> {
  if (format === "pdf") return extractPdfText(file);
  if (format === "docx") return extractDocxText(file);
  return extractMarkdownText(file);
}
