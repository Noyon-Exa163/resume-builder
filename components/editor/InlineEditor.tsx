"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui";
import "./InlineEditor.css";

interface InlineEditorProps {
  /** CSS top position relative to the preview container. */
  top: number;
  /** CSS left position relative to the preview container. */
  left: number;
  /** CSS width of the editing region. */
  width: number;
  /** Current value of the field being edited. */
  value: string;
  /** Human-readable label for the field (shown as header title). */
  label: string;
  /** Called when the user confirms the edit. */
  onConfirm: (nextValue: string) => void;
  /** Called when the user cancels or clicks outside. */
  onCancel: () => void;
}

export function InlineEditor({
  top,
  left,
  width,
  value,
  label,
  onConfirm,
  onCancel,
}: InlineEditorProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [editValue, setEditValue] = useState(value);

  const handleConfirm = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed !== value) onConfirm(trimmed);
    onCancel();
  }, [editValue, value, onConfirm, onCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    },
    [onCancel],
  );

  // Auto-focus the textarea on mount.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  // Clicking outside the editor cancels the edit.
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const editor = document.querySelector(".inline-editor");
      if (editor && !editor.contains(event.target as Node)) {
        onCancel();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onCancel]);

  return (
    <div
      className="inline-editor"
      style={{ top: `${top}px`, left: `${left}px`, width: `${width}px` }}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${label}`}
    >
      <header className="inline-editor__header">
        <span className="inline-editor__title">{label}</span>
        <button
          type="button"
          className="inline-editor__close"
          onClick={onCancel}
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </header>
      <div className="inline-editor__body">
        <textarea
          ref={inputRef}
          className="inline-editor__input"
          value={editValue}
          aria-label={label}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck="false"
          rows={1}
        />
      </div>
      <footer className="inline-editor__footer">
        <Button type="button" variant="secondary" size="s" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="s"
          onClick={handleConfirm}
        >
          Done
        </Button>
      </footer>
    </div>
  );
}
