"use client";

import { useRef, useState } from "react";
import { ImagePlus, RotateCcw, Shuffle, Trash2 } from "lucide-react";
import { ActionDialog, Avatar, Button, Tooltip } from "@/components/ui";
import {
  AVATAR_COLORS,
  AVATAR_EXPRESSION_KEYS,
  type AvatarExpressionKey,
  type AvatarPreferences,
} from "@/lib/avatar";
import {
  AVATAR_PHOTO_ACCEPT,
  fileToAvatarPhotoDataUrl,
} from "@/lib/avatar/photoUpload";
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
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft(value);
      setPhotoError("");
    }
    onOpenChange(next);
  }

  /** Downscales the picked file and stages it in the draft (null removes). */
  async function handlePhotoFile(file: File | undefined) {
    if (!file) return;
    setPhotoError("");
    setIsProcessingPhoto(true);
    try {
      const photoDataUrl = await fileToAvatarPhotoDataUrl(file);
      setDraft((d) => ({ ...d, photoDataUrl }));
    } catch (err) {
      setPhotoError(
        err instanceof Error ? err.message : "Could not read that image.",
      );
    } finally {
      setIsProcessingPhoto(false);
      // Let the same file be re-picked after a fix.
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
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
            onClick={() =>
              setDraft((d) => ({ ...d, hue: null, expression: null }))
            }
          >
            <RotateCcw size={16} />
            Reset
          </Button>
          <Avatar
            name={email}
            size={96}
            hue={draft.hue}
            expression={draft.expression}
            photoDataUrl={draft.photoDataUrl}
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
          <span className="avatar-picker__label" id="avatar-photo-label">
            Photo
          </span>
          <div className="avatar-picker__photo-row">
            <Avatar
              name={email}
              size={64}
              hue={draft.hue}
              expression={draft.expression}
              photoDataUrl={draft.photoDataUrl}
              bare
            />
            <input
              ref={photoInputRef}
              type="file"
              accept={AVATAR_PHOTO_ACCEPT}
              className="avatar-picker__photo-input"
              aria-label="Upload Photo"
              onChange={(e) => void handlePhotoFile(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="secondary"
              size="s"
              disabled={isProcessingPhoto}
              onClick={() => photoInputRef.current?.click()}
            >
              <ImagePlus size={14} />
              {isProcessingPhoto ? "Processing…" : "Upload Photo"}
            </Button>
            {draft.photoDataUrl && (
              <Button
                type="button"
                variant="tertiary"
                size="s"
                onClick={() =>
                  setDraft((d) => ({ ...d, photoDataUrl: null }))
                }
              >
                <Trash2 size={14} />
                Remove Photo
              </Button>
            )}
          </div>
          {photoError && (
            <p className="avatar-picker__photo-error" role="alert">
              {photoError}
            </p>
          )}
          <span className="avatar-picker__photo-hint">
            A photo overrides the generated avatar until you remove it.
          </span>
        </div>

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
