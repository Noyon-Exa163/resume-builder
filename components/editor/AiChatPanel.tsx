"use client";

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { FileText, Loader2, Paperclip, Send, Sparkles, X } from "lucide-react";
import { ConfirmDialog, EmptyState } from "@/components/ui";
import type { ResumeData } from "@/lib/schema/resume";
import type { DeepPartial } from "@/lib/schema/normalize";
import type { ChatFileAttachment, ChatMessage } from "@/lib/ai/chatTypes";
import type { AIChatMessage } from "@/lib/ai/types";
import { AI_CHAT_HISTORY_LIMIT } from "@/lib/ai/chatPrompt";
import { detectFormat } from "@/lib/import/detectFormat";
import { extractPdfText } from "@/lib/import/extractors/pdfText";
import { extractDocxText } from "@/lib/import/extractors/docxText";
import { extractMarkdownText } from "@/lib/import/extractors/markdownText";
import { sendChatMessage } from "@/lib/import/aiChat";
import { aiChatRepository } from "@/lib/storage/aiChat/aiChatRepository";
import { createId } from "@/lib/utils/ids";
import { AiChatMessageBubble } from "./AiChatMessageBubble";
import "./AiChatPanel.css";

type Status = "idle" | "sending";

const ACCEPTED_EXTENSIONS = ".pdf,.docx,.md,.markdown,.txt,.json";

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
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [pendingTurn, setPendingTurn] = useState<PendingTurn | null>(null);

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
  ) {
    if (resumeUpdate) onApply(resumeUpdate);
    const assistantMessage: ChatMessage = {
      id: createId(),
      role: "assistant",
      content: replyText,
      createdAt: new Date().toISOString(),
      appliedChange: resumeUpdate ? { previousResume: currentResume } : undefined,
    };
    commitMessages([...withUserMessage, assistantMessage]);
  }

  async function requestTurn(args: {
    currentResume: ResumeData;
    baseMessages: ChatMessage[];
    userMessage: ChatMessage;
    attachedFileText?: string;
    gateOverwrite: boolean;
  }) {
    const withUserMessage = [...args.baseMessages, args.userMessage];
    commitMessages(withUserMessage);
    setStatus("sending");
    setErrorMessage("");

    try {
      const wireHistory: AIChatMessage[] = args.baseMessages
        .slice(-AI_CHAT_HISTORY_LIMIT)
        .map((m) => ({ role: m.role, content: m.content }));

      const result = await sendChatMessage({
        resume: args.currentResume,
        history: wireHistory,
        message: args.userMessage.content,
        attachedFileText: args.attachedFileText,
      });

      const resumeUpdate = result.resumeUpdate as DeepPartial<ResumeData> | undefined;

      if (args.gateOverwrite && resumeUpdate && hasExistingContent(args.currentResume)) {
        setPendingTurn({
          currentResume: args.currentResume,
          withUserMessage,
          reply: result.reply,
          resumeUpdate,
        });
        return;
      }

      finalizeTurn(args.currentResume, withUserMessage, result.reply, resumeUpdate);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setStatus("idle");
    }
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

    let attachment: ChatFileAttachment | undefined;
    let attachedFileText: string | undefined;
    let directResumeUpdate: DeepPartial<ResumeData> | undefined;

    if (currentFile) {
      const format = detectFormat(currentFile);
      if (format === "unknown") {
        setErrorMessage(
          "Unsupported file type. Attach a PDF, DOCX, Markdown, or a previously exported .json project file.",
        );
        return;
      }
      attachment = { name: currentFile.name, format };
      setStatus("sending");
      try {
        if (format === "json") {
          directResumeUpdate = JSON.parse(
            await currentFile.text(),
          ) as DeepPartial<ResumeData>;
        } else {
          const rawText = await extractText(currentFile, format);
          if (!rawText.trim()) {
            setErrorMessage("Couldn't find any readable text in that file.");
            setStatus("idle");
            return;
          }
          attachedFileText = rawText;
        }
      } catch {
        setErrorMessage("Couldn't read that file — try a different one.");
        setStatus("idle");
        return;
      }
    }

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: trimmedInstruction || `Attached ${currentFile?.name ?? "a file"}`,
      createdAt: new Date().toISOString(),
      attachment,
    };
    const baseMessages = messages;
    resetComposer();

    if (directResumeUpdate) {
      handleDirectImport(resume, baseMessages, userMessage, directResumeUpdate);
      setStatus("idle");
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
    };
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
            icon={Sparkles}
            title="Ask AI to build or refine your resume"
            description="Type an instruction, or attach a resume file to import it."
          />
        )}

        {messages.map((message) => (
          <AiChatMessageBubble
            key={message.id}
            message={message}
            isEditing={editingMessageId === message.id}
            isLatestAssistant={message.id === latestAssistantId}
            isBusy={isBusy}
            onCopy={handleCopy}
            onEditStart={setEditingMessageId}
            onEditSubmit={handleEditSubmit}
            onEditCancel={() => setEditingMessageId(null)}
            onRegenerate={handleRegenerate}
          />
        ))}

        {status === "sending" && (
          <div className="ai-chat-panel__thinking" aria-live="polite">
            <Loader2 size={16} className="button__icon--spin" />
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
              <span className="ai-chat-panel__chip-name">{file.name}</span>
              <button
                type="button"
                className="ai-chat-panel__chip-remove"
                aria-label="Remove attached file"
                onClick={() => setFile(null)}
              >
                <X size={12} />
              </button>
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
            <button
              type="button"
              className="ai-chat-panel__icon-button"
              aria-label="Attach a resume file"
              disabled={isBusy}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={18} />
            </button>

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

            <input
              ref={fileInputRef}
              type="file"
              className="ai-chat-panel__file-input"
              accept={ACCEPTED_EXTENSIONS}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        {errorMessage && (
          <div className="ai-chat-panel__error">{errorMessage}</div>
        )}
      </div>

      <ConfirmDialog
        open={pendingTurn !== null}
        onOpenChange={(open) => {
          if (!open) handleCancelPending();
        }}
        title="Replace current content?"
        description="This will replace the personal info, summary, and sections below with the uploaded file's content."
        confirmLabel="Replace"
        isDestructive={false}
        onConfirm={handleConfirmPending}
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
