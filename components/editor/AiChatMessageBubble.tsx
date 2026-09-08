"use client";

import { useEffect, useState } from "react";
import { Check, Copy, FileText, Pencil, RotateCcw } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import type { ChatMessage } from "@/lib/ai/chatTypes";
import { formatChatTimestampLabel } from "@/lib/utils/formatLastSaved";
import "./AiChatMessageBubble.css";

export interface AiChatMessageBubbleProps {
  message: ChatMessage;
  isEditing: boolean;
  isLatestAssistant: boolean;
  isBusy: boolean;
  onCopy: (message: ChatMessage) => void;
  onEditStart: (id: string) => void;
  onEditSubmit: (id: string, text: string) => void;
  onEditCancel: () => void;
  onRegenerate: (id: string) => void;
}

export function AiChatMessageBubble({
  message,
  isEditing,
  isLatestAssistant,
  isBusy,
  onCopy,
  onEditStart,
  onEditSubmit,
  onEditCancel,
  onRegenerate,
}: AiChatMessageBubbleProps) {
  const [draft, setDraft] = useState(message.content);
  const [justCopied, setJustCopied] = useState(false);
  const isUser = message.role === "user";

  useEffect(() => {
    if (!justCopied) return;
    const timeoutId = window.setTimeout(() => setJustCopied(false), 1500);
    return () => window.clearTimeout(timeoutId);
  }, [justCopied]);

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
      ].join(" ")}
    >
      <div className="ai-chat-message__bubble">
        {message.attachment && (
          <div className="ai-chat-message__attachment">
            <FileText size={14} />
            <span>{message.attachment.name}</span>
          </div>
        )}

        {isEditing ? (
          <div className="ai-chat-message__edit">
            <textarea
              className="ai-chat-message__edit-textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
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
          <p className="ai-chat-message__text">{message.content}</p>
        )}

        {message.appliedChange && (
          <Badge variant="secondary">Applied to resume</Badge>
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
              aria-label="Copy message"
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
                aria-label="Edit message"
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
                aria-label="Regenerate response"
                disabled={isBusy}
                onClick={() => onRegenerate(message.id)}
              >
                <RotateCcw size={14} />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
