"use client";

import { useState } from "react";
import { RotateCcw, Shuffle } from "lucide-react";
import { ActionDialog, Avatar, Button, Tooltip } from "@/components/ui";
import {
  AVATAR_COLORS,
  AVATAR_EXPRESSION_KEYS,
  type AvatarExpressionKey,
  type AvatarPreferences,
} from "@/lib/avatar";
import "./AvatarPickerDialog.css";

export interface AvatarPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Seeds the avatar when no color is chosen, so previews match the default. */
  email: string;
  value: AvatarPreferences;
  isSaving: boolean;
  error: string;
  onSave: (next: AvatarPreferences) => void;
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function toLabel(key: AvatarExpressionKey) {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/** Dialog for choosing an avatar color (hue) and expression, with live preview. */
export default function AvatarPickerDialog({
  open,
  onOpenChange,
  email,
  value,
  isSaving,
  error,
  onSave,
}: AvatarPickerDialogProps) {
  const [draft, setDraft] = useState<AvatarPreferences>(value);

  function handleOpenChange(next: boolean) {
    if (next) setDraft(value);
    onOpenChange(next);
  }

  function handleRandomize() {
    const expression = pickRandom(AVATAR_EXPRESSION_KEYS);
    setDraft({
      hue: pickRandom(AVATAR_COLORS).hue,
      expression: expression === "idle" ? null : expression,
    });
  }

  return (
    <ActionDialog
      media={
        <div className="avatar-picker__stage">
          <Button
            type="button"
            variant="tertiary"
            size="s"
            onClick={() => setDraft({ hue: null, expression: null })}
          >
            <RotateCcw size={16} />
            Reset
          </Button>
          <Avatar
            name={email}
            size={96}
            hue={draft.hue}
            expression={draft.expression}
            followPointer
            bare
          />
          <Button
            type="button"
            variant="tertiary"
            size="s"
            onClick={handleRandomize}
          >
            <Shuffle size={16} />
            Random
          </Button>
        </div>
      }
      open={open}
      onOpenChange={handleOpenChange}
      title="Customize Avatar"
      confirmLabel="Save Avatar"
      loadingLabel="Saving…"
      isLoading={isSaving}
      onConfirm={() => onSave(draft)}
      className="avatar-picker__popup"
    >
      <div className="avatar-picker">
        {error && <div className="avatar-picker__error">{error}</div>}

        <div className="avatar-picker__field">
          <span className="avatar-picker__label" id="avatar-color-label">
            Color
          </span>
          <div
            className="avatar-picker__colors"
            role="radiogroup"
            aria-labelledby="avatar-color-label"
          >
            {AVATAR_COLORS.map(({ label, hue, cssVar }) => (
              <Tooltip key={hue} label={label}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={draft.hue === hue}
                  aria-label={label}
                  className={[
                    "avatar-picker__color",
                    draft.hue === hue && "avatar-picker__color--selected",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ backgroundColor: `var(${cssVar})` }}
                  onClick={() => setDraft((d) => ({ ...d, hue }))}
                />
              </Tooltip>
            ))}
          </div>
        </div>

        <div className="avatar-picker__field">
          <span className="avatar-picker__label" id="avatar-expression-label">
            Expression
          </span>
          <div
            className="avatar-picker__expressions"
            role="radiogroup"
            aria-labelledby="avatar-expression-label"
          >
            {AVATAR_EXPRESSION_KEYS.map((key) => {
              const isSelected = (draft.expression ?? "idle") === key;
              return (
                <Tooltip key={key} label={toLabel(key)}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={toLabel(key)}
                    className={[
                      "avatar-picker__expression",
                      isSelected && "avatar-picker__expression--selected",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        expression: key === "idle" ? null : key,
                      }))
                    }
                  >
                    <Avatar
                      name={email}
                      size={40}
                      hue={draft.hue}
                      expression={key}
                      bare
                    />
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </ActionDialog>
  );
}
