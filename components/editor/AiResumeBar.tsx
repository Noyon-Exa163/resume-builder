"use client";

import {
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { FileText, Loader2, Paperclip, Send, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui";
import type { ResumeData } from "@/lib/schema/resume";
import type { DeepPartial } from "@/lib/schema/normalize";
import { detectFormat } from "@/lib/import/detectFormat";
import { extractPdfText } from "@/lib/import/extractors/pdfText";
import { extractDocxText } from "@/lib/import/extractors/docxText";
import { extractMarkdownText } from "@/lib/import/extractors/markdownText";
import { parseResumeWithAi } from "@/lib/import/aiParser";
import { refineResumeWithAi } from "@/lib/import/aiRefine";
import "./AiResumeBar.css";

type Status = "idle" | "reading" | "processing";

const ACCEPTED_EXTENSIONS = ".pdf,.docx,.md,.markdown,.txt,.json";

export interface AiResumeBarProps {
  resume: ResumeData;
  onApply: (partial: DeepPartial<ResumeData>) => void;
  className?: string;
}

/**
 * One control for both ways of using AI on a resume: attach a file (with or
 * without a note) to build/replace the resume from it, or type alone to
 * refine what's already there. Which one happens is decided purely by
 * whether a file is attached — no separate mode toggle.
 */
export function AiResumeBar({ resume, onApply, className }: AiResumeBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [instruction, setInstruction] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [pendingPartial, setPendingPartial] =
    useState<DeepPartial<ResumeData> | null>(null);

  const hasExistingContent =
    Boolean(resume.personalInfo.fullName?.trim()) ||
    Boolean(resume.summary?.trim()) ||
    resume.sections.length > 0;

  function resetForm() {
    setFile(null);
    setInstruction("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function commit(partial: DeepPartial<ResumeData>) {
    try {
      onApply(partial);
      resetForm();
    } catch {
      setErrorMessage(
        "Couldn't read that as a resume — try a different file, or describe the change in words instead.",
      );
    }
  }

  async function handleSend() {
    const trimmedInstruction = instruction.trim();
    if (!file && !trimmedInstruction) return;
    setErrorMessage("");

    try {
      if (file) {
        // A file is always "here's my resume" — extract it, confirming
        // first if that would overwrite something already filled in.
        const format = detectFormat(file);
        if (format === "unknown") {
          setErrorMessage(
            "Unsupported file type. Attach a PDF, DOCX, Markdown, or a previously exported .json project file.",
          );
          return;
        }

        setStatus("reading");
        let partial: DeepPartial<ResumeData>;
        if (format === "json") {
          partial = JSON.parse(await file.text()) as DeepPartial<ResumeData>;
        } else {
          const rawText = await extractText(file, format);
          if (!rawText.trim()) {
            setErrorMessage("Couldn't find any readable text in that file.");
            return;
          }
          setStatus("processing");
          const { json } = await parseResumeWithAi(
            rawText,
            trimmedInstruction || undefined,
          );
          partial = json as DeepPartial<ResumeData>;
        }

        if (hasExistingContent) {
          setPendingPartial(partial);
        } else {
          commit(partial);
        }
      } else {
        // Text alone, no file: refine what's already there. The user asked
        // for this explicitly, so it applies straight away — no confirm.
        setStatus("processing");
        const { json } = await refineResumeWithAi(resume, trimmedInstruction);
        onApply(json as DeepPartial<ResumeData>);
        setInstruction("");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setStatus("idle");
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  const isBusy = status !== "idle";
  const canSend = (Boolean(file) || Boolean(instruction.trim())) && !isBusy;
  const placeholder = file
    ? "Add a note for the AI (optional)…"
    : "Attach a resume file, or tell AI what to change…";

  return (
    <div className={["ai-resume-bar", className].filter(Boolean).join(" ")}>
      <div
        className={[
          "ai-resume-bar__box",
          isDragging && "ai-resume-bar__box--dragging",
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
        {file && (
          <div className="ai-resume-bar__chip">
            <FileText size={14} />
            <span className="ai-resume-bar__chip-name">{file.name}</span>
            <button
              type="button"
              className="ai-resume-bar__chip-remove"
              aria-label="Remove attached file"
              onClick={() => setFile(null)}
            >
              <X size={12} />
            </button>
          </div>
        )}

        <textarea
          className="ai-resume-bar__textarea"
          placeholder={placeholder}
          value={instruction}
          disabled={isBusy}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <div className="ai-resume-bar__row">
          <button
            type="button"
            className="ai-resume-bar__icon-button"
            aria-label="Attach a resume file"
            disabled={isBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={18} />
          </button>

          <button
            type="button"
            className="ai-resume-bar__icon-button ai-resume-bar__icon-button--send"
            aria-label="Send"
            disabled={!canSend}
            onClick={() => void handleSend()}
          >
            {isBusy ? (
              <Loader2 size={18} className="button__icon--spin" />
            ) : (
              <Send size={18} />
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            className="ai-resume-bar__file-input"
            accept={ACCEPTED_EXTENSIONS}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      {errorMessage && <div className="ai-resume-bar__error">{errorMessage}</div>}

      <ConfirmDialog
        open={pendingPartial !== null}
        onOpenChange={(open) => {
          if (!open) setPendingPartial(null);
        }}
        title="Replace current content?"
        description="This will replace the personal info, summary, and sections below with the uploaded file's content."
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
