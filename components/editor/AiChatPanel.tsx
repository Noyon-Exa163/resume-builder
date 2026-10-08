"use client";

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import {
  FileText,
  Loader2,
  Paperclip,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { ActionDialog, EmptyState, Tooltip } from "@/components/ui";
import type { ResumeData } from "@/lib/schema/resume";
import type { DeepPartial } from "@/lib/schema/normalize";
import type {
  ChatFileAttachment,
  ChatMessage,
  ChatTurnStage,
} from "@/lib/ai/chatTypes";
import type { AIChatMessage } from "@/lib/ai/types";
import { AI_CHAT_HISTORY_LIMIT } from "@/lib/ai/chatPrompt";
import { applySkillIconDefaults } from "@/lib/skillIcons/defaults";
import { detectFormat, IMAGE_EXTENSIONS } from "@/lib/import/detectFormat";
import { extractImageTextWithOcr } from "@/lib/import/extractors/imageOcr";
import { parseResumeJson } from "@/lib/import/jsonImport";
import { truncateFilenameMiddle } from "@/lib/utils/truncateFilename";
import { extractPdfText } from "@/lib/import/extractors/pdfText";
import {
  extractPdfTextWithOcr,
  type OcrProgress,
} from "@/lib/import/extractors/pdfOcr";
import { extractDocxText } from "@/lib/import/extractors/docxText";
import { extractMarkdownText } from "@/lib/import/extractors/markdownText";
import { sendChatMessage } from "@/lib/import/aiChat";
import { aiChatRepository } from "@/lib/storage/aiChat/aiChatRepository";
import { createId } from "@/lib/utils/ids";
import { AiChatMessageBubble } from "./AiChatMessageBubble";
import "./AiChatPanel.css";

type Status = "idle" | "sending";
type LoadingStage = "reading" | "thinking" | null;

/** Plain-language wording for each real milestone — no technical terms. */
const STAGE_TEXT: Record<ChatTurnStage, string> = {
  deciding: "Working out what you're asking for…",
  writing: "The AI is writing your update…",
  checking: "Checking that everything looks right…",
};
const IMPORT_WRITING_TEXT = "The AI is organizing your resume into sections…";

/** After this long, reassure the person that a slow import is normal. */
const SLOW_WAIT_HINT_SECONDS = 20;

function describeOcrProgress(progress: OcrProgress): string {
  if (progress.step === "reading-image") {
    return "Reading the text in your image…";
  }
  if (progress.step === "preparing") {
    return "Getting ready to read your scanned pages (the first time can take a moment)…";
  }
  const base = `Reading page ${progress.page} of ${progress.totalPages}…`;
  return progress.skippedPages > 0
    ? `${base} Only the first ${progress.totalPages} pages are read.`
    : base;
}

const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".md",
  ".markdown",
  ".txt",
  ".json",
  ...IMAGE_EXTENSIONS,
].join(",");
/** Keeps the composer's file chip from forcing the sidebar wider than its
 *  fixed width — see .ai-chat-panel__chip-name's max-width:220px. */
const CHIP_NAME_MAX_LENGTH = 28;

export interface AiChatPanelProps {
  resume: ResumeData;
  onApply: (partial: DeepPartial<ResumeData>) => void;
  className?: string;
}

interface PendingTurn {
  currentResume: ResumeData;
  withUserMessage: ChatMessage[];
  reply: string;
  resumeUpdate: DeepPartial<ResumeData>;
  model?: string;
  totalTokens?: number;
}

interface RequestTurnArgs {
  currentResume: ResumeData;
  baseMessages: ChatMessage[];
  userMessage: ChatMessage;
  attachedFileText?: string;
  gateOverwrite: boolean;
}

function hasExistingContent(resume: ResumeData): boolean {
  return (
    Boolean(resume.personalInfo.fullName?.trim()) ||
    Boolean(resume.summary?.trim()) ||
    resume.sections.length > 0
  );
}

/**
 * A ChatGPT/Claude-style conversation over the resume: every turn decides
 * for itself (server-side, see lib/ai/chatPrompt.ts) whether it's a plain
 * reply or an instruction that should also update the resume. History
 * persists per resume (lib/storage/aiChat/) so it survives a reload.
 */
export function AiChatPanel({ resume, onApply, className }: AiChatPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [instruction, setInstruction] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [loadingStage, setLoadingStage] = useState<LoadingStage>(null);
  const [progressText, setProgressText] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [pendingTurn, setPendingTurn] = useState<PendingTurn | null>(null);
  const [failedRequest, setFailedRequest] = useState<RequestTurnArgs | null>(null);
  // The one assistant message that should type itself out — set only when a
  // reply just arrived this session, never for history loaded from storage,
  // so reopening a resume doesn't replay the animation for old messages.
  const [animateMessageId, setAnimateMessageId] = useState<string | null>(null);

  // Keyed by resume.meta.id from the parent (see page.tsx) so navigating to
  // a different resume remounts this panel with fresh initial state,
  // rather than needing an effect to reset state on id change.
  useEffect(() => {
    let cancelled = false;
    aiChatRepository
      .get(resume.meta.id)
      .then((record) => {
        if (cancelled) return;
        setMessages(record?.messages ?? []);
        setIsHistoryLoaded(true);
      })
      .catch((error) => {
        console.error("Failed to load AI chat history:", error);
        if (!cancelled) setIsHistoryLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [resume.meta.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, status]);

  // Ticks continuously across the reading→thinking handoff (loadingStage
  // changes but never goes through null in between) so the counter reflects
  // total time spent on this turn so far, not time in the current stage.
  useEffect(() => {
    if (!loadingStage) {
      const reset = () => setElapsedSeconds(0);
      reset();
      return;
    }
    const intervalId = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [loadingStage]);

  function commitMessages(next: ChatMessage[]) {
    setMessages(next);
    void aiChatRepository
      .set(resume.meta.id, { messages: next, updatedAt: new Date().toISOString() })
      .catch((error) => {
        console.error("Failed to persist AI chat history:", error);
      });
  }

  function resetComposer() {
    setFile(null);
    setInstruction("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function finalizeTurn(
    currentResume: ResumeData,
    withUserMessage: ChatMessage[],
    replyText: string,
    resumeUpdate?: DeepPartial<ResumeData>,
    model?: string,
    totalTokens?: number,
  ) {
    if (resumeUpdate) onApply(resumeUpdate);
    const assistantMessage: ChatMessage = {
      id: createId(),
      role: "assistant",
      content: replyText,
      createdAt: new Date().toISOString(),
      appliedChange: resumeUpdate ? { previousResume: currentResume } : undefined,
      model,
      totalTokens,
    };
    setAnimateMessageId(assistantMessage.id);
    commitMessages([...withUserMessage, assistantMessage]);
  }

  async function requestTurn(args: RequestTurnArgs) {
    const withUserMessage = [...args.baseMessages, args.userMessage];
    commitMessages(withUserMessage);
    setStatus("sending");
    setLoadingStage("thinking");
    setProgressText("Sending your request to the AI…");
    setErrorMessage("");
    setFailedRequest(null);

    try {
      const wireHistory: AIChatMessage[] = args.baseMessages
        .slice(-AI_CHAT_HISTORY_LIMIT)
        .map((m) => ({ role: m.role, content: m.content }));

      // A regenerated or edited file message still carries its own text.
      const attachedFileText = args.attachedFileText ?? args.userMessage.sourceText;
      const sourceFileText = attachedFileText
        ? undefined
        : findLatestSourceText(args.baseMessages);

      const result = await sendChatMessage({
        resume: args.currentResume,
        history: wireHistory,
        message: args.userMessage.content,
        attachedFileText,
        sourceFileText,
        onStage: (stage) =>
          setProgressText(
            stage === "writing" && attachedFileText
              ? IMPORT_WRITING_TEXT
              : STAGE_TEXT[stage],
          ),
      });
      setProgressText("Applying the changes to your resume…");

      const rawUpdate = result.resumeUpdate as DeepPartial<ResumeData> | undefined;
      const resumeUpdate = rawUpdate
        ? applySkillIconDefaults(args.currentResume, rawUpdate)
        : undefined;

      if (args.gateOverwrite && resumeUpdate && hasExistingContent(args.currentResume)) {
        setPendingTurn({
          currentResume: args.currentResume,
          withUserMessage,
          reply: result.reply,
          resumeUpdate,
          model: result.model,
          totalTokens: result.totalTokens,
        });
        return;
      }

      finalizeTurn(
        args.currentResume,
        withUserMessage,
        result.reply,
        resumeUpdate,
        result.model,
        result.totalTokens,
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong.",
      );
      setFailedRequest(args);
    } finally {
      setStatus("idle");
      setLoadingStage(null);
    }
  }

  function handleRetry() {
    if (status !== "idle" || !failedRequest) return;
    void requestTurn(failedRequest);
  }

  function handleDirectImport(
    currentResume: ResumeData,
    baseMessages: ChatMessage[],
    userMessage: ChatMessage,
    resumeUpdate: DeepPartial<ResumeData>,
  ) {
    const withUserMessage = [...baseMessages, userMessage];
    commitMessages(withUserMessage);
    if (hasExistingContent(currentResume)) {
      setPendingTurn({
        currentResume,
        withUserMessage,
        reply: "I've read the attached file — want me to replace what's here?",
        resumeUpdate,
      });
    } else {
      finalizeTurn(
        currentResume,
        withUserMessage,
        "Imported your resume from the attached file.",
        resumeUpdate,
      );
    }
  }

  async function handleSend() {
    if (status !== "idle" || !isHistoryLoaded) return;
    const trimmedInstruction = instruction.trim();
    const currentFile = file;
    if (!currentFile && !trimmedInstruction) return;
    setErrorMessage("");
    setFailedRequest(null);

    let attachment: ChatFileAttachment | undefined;
    let attachedFileText: string | undefined;
    let directResumeUpdate: DeepPartial<ResumeData> | undefined;

    if (currentFile) {
      const format = detectFormat(currentFile);
      if (format === "unknown") {
        setErrorMessage(
          "Unsupported file type. Attach a PDF, DOCX, an image (PNG, JPG, WebP, AVIF), Markdown, or a previously exported .json project file.",
        );
        return;
      }
      attachment = { name: currentFile.name, format };
      setStatus("sending");
      setLoadingStage("reading");
      setProgressText("Opening your file…");
      try {
        if (format === "json") {
          const parsedJson = parseResumeJson(await currentFile.text());
          if (!parsedJson.ok) {
            setErrorMessage(parsedJson.error);
            setStatus("idle");
            setLoadingStage(null);
            return;
          }
          if (trimmedInstruction) {
            // The person asked for something to be done with this data, so
            // the AI gets the JSON along with their message.
            attachedFileText = JSON.stringify(parsedJson.data);
          } else {
            directResumeUpdate = parsedJson.data;
          }
        } else {
          const rawText = await extractText(currentFile, format, (progress) =>
            setProgressText(describeOcrProgress(progress)),
          );
          if (!rawText.trim()) {
            setErrorMessage("Couldn't find any readable text in that file.");
            setStatus("idle");
            setLoadingStage(null);
            return;
          }
          attachedFileText = rawText;
        }
      } catch (err) {
        // Surface the real reason (e.g. the OCR engine timing out) instead
        // of always blaming the file — it usually isn't the file's fault.
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Couldn't read that file — try a different one.",
        );
        setStatus("idle");
        setLoadingStage(null);
        return;
      }
    }

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: trimmedInstruction || `Attached ${currentFile?.name ?? "a file"}`,
      createdAt: new Date().toISOString(),
      attachment,
      sourceText: attachedFileText,
    };
    const baseMessages = messages;
    resetComposer();

    if (directResumeUpdate) {
      handleDirectImport(resume, baseMessages, userMessage, directResumeUpdate);
      setStatus("idle");
      setLoadingStage(null);
      return;
    }

    await requestTurn({
      currentResume: resume,
      baseMessages,
      userMessage,
      attachedFileText,
      gateOverwrite: Boolean(currentFile),
    });
  }

  async function handleEditSubmit(id: string, newText: string) {
    if (!newText.trim() || status !== "idle") return;
    const index = messages.findIndex((m) => m.id === id);
    if (index === -1) return;
    setEditingMessageId(null);

    const nextMessage = messages[index + 1];
    const discardedAssistant =
      nextMessage?.role === "assistant" ? nextMessage : undefined;
    const currentResume = discardedAssistant?.appliedChange
      ? discardedAssistant.appliedChange.previousResume
      : resume;
    if (discardedAssistant?.appliedChange) {
      onApply(discardedAssistant.appliedChange.previousResume);
    }

    const baseMessages = messages.slice(0, index);
    const editedMessage: ChatMessage = {
      ...messages[index],
      content: newText,
      createdAt: new Date().toISOString(),
    };

    await requestTurn({
      currentResume,
      baseMessages,
      userMessage: editedMessage,
      gateOverwrite: false,
    });
  }

  async function handleRegenerate(assistantId: string) {
    if (status !== "idle") return;
    const index = messages.findIndex((m) => m.id === assistantId);
    if (index <= 0) return;
    const assistantMessage = messages[index];
    const userMessage = messages[index - 1];
    if (userMessage.role !== "user") return;

    const currentResume = assistantMessage.appliedChange
      ? assistantMessage.appliedChange.previousResume
      : resume;
    if (assistantMessage.appliedChange) {
      onApply(assistantMessage.appliedChange.previousResume);
    }

    const baseMessages = messages.slice(0, index - 1);

    await requestTurn({
      currentResume,
      baseMessages,
      userMessage,
      gateOverwrite: false,
    });
  }

  function handleCopy(message: ChatMessage) {
    void navigator.clipboard.writeText(message.content);
  }

  function handleConfirmPending() {
    if (!pendingTurn) return;
    finalizeTurn(
      pendingTurn.currentResume,
      pendingTurn.withUserMessage,
      pendingTurn.reply,
      pendingTurn.resumeUpdate,
      pendingTurn.model,
      pendingTurn.totalTokens,
    );
    setPendingTurn(null);
  }

  function handleCancelPending() {
    if (!pendingTurn) return;
    const assistantMessage: ChatMessage = {
      id: createId(),
      role: "assistant",
      content: pendingTurn.reply,
      createdAt: new Date().toISOString(),
      model: pendingTurn.model,
      totalTokens: pendingTurn.totalTokens,
    };
    setAnimateMessageId(assistantMessage.id);
    commitMessages([...pendingTurn.withUserMessage, assistantMessage]);
    setPendingTurn(null);
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
    : "Ask AI a question, or tell it what to change…";
  const latestAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  return (
    <div className={["ai-chat-panel", className].filter(Boolean).join(" ")}>
      <div className="ai-chat-panel__messages">
        {isHistoryLoaded && messages.length === 0 && (
          <EmptyState
            className="ai-chat-panel__empty-state"
            icon={Sparkles}
            title="Upload a CV to create your Exabyting-branded resume!"
            description="Attach a PDF, DOCX, image, Markdown, or text file and AI will rebuild it with Exabyting's branding — or a previously exported .json project file to restore it. You can also just type what you'd like to change."
          />
        )}

        {messages.map((message) => (
          <AiChatMessageBubble
            key={message.id}
            message={message}
            isEditing={editingMessageId === message.id}
            isLatestAssistant={message.id === latestAssistantId}
            isBusy={isBusy}
            shouldAnimate={message.id === animateMessageId}
            onCopy={handleCopy}
            onEditStart={setEditingMessageId}
            onEditSubmit={handleEditSubmit}
            onEditCancel={() => setEditingMessageId(null)}
            onRegenerate={handleRegenerate}
          />
        ))}

        {status === "sending" && loadingStage && (
          <div className="ai-chat-panel__thinking" aria-live="polite">
            <Loader2 size={16} className="button__icon--spin" />
            <span className="ai-chat-panel__thinking-label">
              {progressText ||
                (loadingStage === "reading"
                  ? "Reading your file…"
                  : "Talking to AI…")}
              {loadingStage === "thinking" &&
                elapsedSeconds >= SLOW_WAIT_HINT_SECONDS && (
                  <span className="ai-chat-panel__thinking-hint">
                    Long resumes can take about a minute. Hang tight.
                  </span>
                )}
            </span>
            <span className="ai-chat-panel__thinking-elapsed">
              {elapsedSeconds}s
            </span>
          </div>
        )}

        {status === "idle" && errorMessage && failedRequest && (
          <div
            className="ai-chat-message ai-chat-message--assistant ai-chat-message--error"
            aria-live="polite"
          >
            <div className="ai-chat-message__bubble">
              <p className="ai-chat-message__text">{errorMessage}</p>
            </div>
            <div className="ai-chat-message__footer">
              <button
                type="button"
                className="ai-chat-panel__retry"
                disabled={isBusy}
                onClick={handleRetry}
              >
                <RotateCcw size={13} />
                Retry
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="ai-chat-panel__composer">
        <div
          className={[
            "ai-chat-panel__composer-box",
            isDragging && "ai-chat-panel__composer-box--dragging",
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
            <div className="ai-chat-panel__chip">
              <FileText size={14} />
              <span className="ai-chat-panel__chip-name" title={file.name}>
                {truncateFilenameMiddle(file.name, CHIP_NAME_MAX_LENGTH)}
              </span>
              <Tooltip label="Remove File">
                <button
                  type="button"
                  className="ai-chat-panel__chip-remove"
                  aria-label="Remove File"
                  onClick={() => setFile(null)}
                >
                  <X size={12} />
                </button>
              </Tooltip>
            </div>
          )}

          <textarea
            className="ai-chat-panel__textarea"
            placeholder={placeholder}
            value={instruction}
            disabled={isBusy}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <div className="ai-chat-panel__row">
            <Tooltip label="Attach File">
              <button
                type="button"
                className="ai-chat-panel__icon-button"
                aria-label="Attach File"
                disabled={isBusy}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={18} />
              </button>
            </Tooltip>

            <Tooltip label="Send">
              <button
                type="button"
                className="ai-chat-panel__icon-button ai-chat-panel__icon-button--send"
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
            </Tooltip>

            <input
              ref={fileInputRef}
              type="file"
              className="ai-chat-panel__file-input"
              accept={ACCEPTED_EXTENSIONS}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        {errorMessage && !failedRequest && (
          <div className="ai-chat-panel__error">
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      <ActionDialog
        icon={TriangleAlert}
        tone="warning"
        open={pendingTurn !== null}
        onOpenChange={(open) => {
          if (!open) handleCancelPending();
        }}
        title="Replace current content?"
        description="This will replace the personal info, summary, and sections below with the uploaded file's content."
        confirmLabel="Replace"
        confirmIcon={RefreshCw}
        onConfirm={handleConfirmPending}
      />
    </div>
  );
}

/** The most recent file text in the conversation, for follow-up turns. */
function findLatestSourceText(messages: ChatMessage[]): string | undefined {
  return [...messages].reverse().find((m) => m.sourceText)?.sourceText;
}

async function extractText(
  file: File,
  format: "pdf" | "docx" | "markdown" | "text" | "image",
  onOcrProgress: (progress: OcrProgress) => void,
): Promise<string> {
  if (format === "pdf") {
    const text = await extractPdfText(file);
    // A scanned PDF has no text layer, so fall back to reading it with OCR.
    return text.trim() ? text : extractPdfTextWithOcr(file, onOcrProgress);
  }
  if (format === "image") {
    return extractImageTextWithOcr(file, () =>
      onOcrProgress({ step: "reading-image" }),
    );
  }
  if (format === "docx") return extractDocxText(file);
  return extractMarkdownText(file);
}
