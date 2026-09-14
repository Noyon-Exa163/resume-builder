"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Check, Copy, FileText, Info, Pencil, RotateCcw } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import type { ChatMessage } from "@/lib/ai/chatTypes";
import { formatChatTimestampLabel } from "@/lib/utils/formatLastSaved";
import { truncateFilenameMiddle } from "@/lib/utils/truncateFilename";
import "./AiChatMessageBubble.css";

/** Keeps a long attached-file name from forcing the bubble wider than the
 *  sidebar — see .ai-chat-message__attachment. */
const ATTACHMENT_NAME_MAX_LENGTH = 32;

export interface AiChatMessageBubbleProps {
  message: ChatMessage;
  isEditing: boolean;
  isLatestAssistant: boolean;
  isBusy: boolean;
  /** True only for the reply that just arrived this session — types itself
   *  out ChatGPT/Claude-style. Never true for history loaded from storage. */
  shouldAnimate: boolean;
  onCopy: (message: ChatMessage) => void;
  onEditStart: (id: string) => void;
  onEditSubmit: (id: string, text: string) => void;
  onEditCancel: () => void;
  onRegenerate: (id: string) => void;
}

/** Total time to reveal a reply, independent of its length — long and short
 *  replies both finish "quickly" rather than long ones dragging on. */
const TYPE_DURATION_MS = 600;
const TYPE_TICK_MS = 20;

/** Grows a textarea to exactly fit its content. Reset to "auto" first so
 *  deleting text can shrink it back down, not just grow. */
function resizeDraftTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

export function AiChatMessageBubble({
  message,
  isEditing,
  isLatestAssistant,
  isBusy,
  shouldAnimate,
  onCopy,
  onEditStart,
  onEditSubmit,
  onEditCancel,
  onRegenerate,
}: AiChatMessageBubbleProps) {
  const [draft, setDraft] = useState(message.content);
  const [justCopied, setJustCopied] = useState(false);
  const isUser = message.role === "user";
  const [revealedLength, setRevealedLength] = useState(
    shouldAnimate && !isUser ? 0 : message.content.length,
  );
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!justCopied) return;
    const timeoutId = window.setTimeout(() => setJustCopied(false), 1500);
    return () => window.clearTimeout(timeoutId);
  }, [justCopied]);

  // Grows the textarea to fit the message being edited right away, rather
  // than opening at a small fixed size the original text has to scroll
  // inside — see the matching resize call in handleDraftChange below.
  useEffect(() => {
    if (isEditing) resizeDraftTextarea(editTextareaRef.current);
  }, [isEditing]);

  function handleDraftChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setDraft(e.target.value);
    resizeDraftTextarea(e.target);
  }

  // Runs once per distinct message (this component is keyed by message.id
  // in AiChatPanel, so a new message always mounts fresh).
  useEffect(() => {
    if (!shouldAnimate || isUser) return;
    const total = message.content.length;
    if (total === 0) return;
    const ticks = Math.max(1, Math.round(TYPE_DURATION_MS / TYPE_TICK_MS));
    const step = Math.max(1, Math.ceil(total / ticks));
    const intervalId = window.setInterval(() => {
      setRevealedLength((prev) => {
        const next = prev + step;
        if (next >= total) {
          window.clearInterval(intervalId);
          return total;
        }
        return next;
      });
    }, TYPE_TICK_MS);
    return () => window.clearInterval(intervalId);
    // Intentionally only depends on identity — shouldAnimate/message.content
    // are fixed for the lifetime of a given message.id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id]);

  const timestampLabel = formatChatTimestampLabel(message.createdAt);

  function handleCopyClick() {
    onCopy(message);
    setJustCopied(true);
  }

  return (
    <div
      className={[
        "ai-chat-message",
        isUser ? "ai-chat-message--user" : "ai-chat-message--assistant",
        isEditing && "ai-chat-message--editing",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="ai-chat-message__bubble">
        {message.attachment && (
          <div className="ai-chat-message__attachment">
            <FileText size={14} />
            <span title={message.attachment.name}>
              {truncateFilenameMiddle(
                message.attachment.name,
                ATTACHMENT_NAME_MAX_LENGTH,
              )}
            </span>
          </div>
        )}

        {isEditing ? (
          <div className="ai-chat-message__edit">
            <textarea
              ref={editTextareaRef}
              className="ai-chat-message__edit-textarea"
              value={draft}
              onChange={handleDraftChange}
              autoFocus
            />
            <div className="ai-chat-message__edit-actions">
              <Button
                type="button"
                variant="tertiary"
                size="s"
                onClick={onEditCancel}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="s"
                disabled={!draft.trim()}
                onClick={() => onEditSubmit(message.id, draft.trim())}
              >
                Save & Resend
              </Button>
            </div>
          </div>
        ) : (
          <p className="ai-chat-message__text">
            {message.content.slice(0, revealedLength)}
            {revealedLength < message.content.length && (
              <span className="ai-chat-message__cursor" aria-hidden="true" />
            )}
          </p>
        )}

        {message.appliedChange && (
          <Badge variant="secondary">
            <Check size={12} aria-hidden="true" />
            Applied to resume
          </Badge>
        )}
      </div>

      {!isEditing && (
        <div className="ai-chat-message__footer">
          <span className="ai-chat-message__timestamp">
            {timestampLabel}
          </span>
          <div className="ai-chat-message__actions">
            <Button
              type="button"
              variant="tertiary"
              size="s"
              iconOnly
              aria-label={justCopied ? "Copied" : "Copy Message"}
              disabled={isBusy}
              onClick={handleCopyClick}
            >
              {justCopied ? <Check size={14} /> : <Copy size={14} />}
            </Button>
            {isUser && (
              <Button
                type="button"
                variant="tertiary"
                size="s"
                iconOnly
                aria-label="Edit Message"
                disabled={isBusy}
                onClick={() => {
                  setDraft(message.content);
                  onEditStart(message.id);
                }}
              >
                <Pencil size={14} />
              </Button>
            )}
            {!isUser && isLatestAssistant && (
              <Button
                type="button"
                variant="tertiary"
                size="s"
                iconOnly
                aria-label="Regenerate Response"
                disabled={isBusy}
                onClick={() => onRegenerate(message.id)}
              >
                <RotateCcw size={14} />
              </Button>
            )}
            {!isUser && (message.totalTokens != null || message.model) && (
              <Button
                type="button"
                variant="tertiary"
                size="s"
                iconOnly
                aria-label="Response Details"
                tooltip={
                  <div className="ai-chat-message__usage-tooltip">
                    {message.totalTokens != null && (
                      <div>
                        Tokens Used: {message.totalTokens.toLocaleString()}
                      </div>
                    )}
                    {message.model && <div>Model Used: {message.model}</div>}
                  </div>
                }
              >
                <Info size={14} />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
