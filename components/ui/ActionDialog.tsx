"use client";

import type { ComponentType, ReactNode } from "react";
import { Check, Loader2, X } from "lucide-react";
import { DialogRoot, DialogPopup } from "./Dialog";
import Button from "./Button";
import "./ActionDialog.css";

type IconComponent = ComponentType<{ size?: number; className?: string }>;

export interface ActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Spot illustration (image URL) shown above the title. */
  illustration?: string;
  /** Custom node shown above the title; takes precedence over `illustration` and `icon`. */
  media?: ReactNode;
  /** Icon badge shown above the title when there is no illustration. */
  icon?: IconComponent;
  /** Tints the icon badge. */
  tone?: "default" | "warning";
  /** Form or list content, left-aligned below the description. */
  children?: ReactNode;
  cancelLabel?: string;
  confirmLabel: string;
  /** Shown on the confirm button while `isLoading` is false. */
  confirmIcon?: IconComponent;
  /** Label shown while `isLoading` is true. */
  loadingLabel?: string;
  isLoading?: boolean;
  isConfirmDisabled?: boolean;
  isDestructive?: boolean;
  /** Submits the form with this id instead of calling `onConfirm`. */
  formId?: string;
  onConfirm?: () => void;
  /** Extra class on the popup, e.g. to widen it for a list. */
  className?: string;
}

/**
 * The app's standard dialog: centered header (illustration or icon badge,
 * title, description), optional left-aligned content, and two equal-width
 * M buttons. Use for confirmations and for form dialogs (pass `formId`).
 */
export default function ActionDialog({
  open,
  onOpenChange,
  title,
  description,
  illustration,
  media: customMedia,
  icon: Icon,
  tone = "default",
  children,
  cancelLabel = "Cancel",
  confirmLabel,
  confirmIcon: ConfirmIcon = Check,
  loadingLabel,
  isLoading = false,
  isConfirmDisabled = false,
  isDestructive = false,
  formId,
  onConfirm,
  className,
}: ActionDialogProps) {
  let media: ReactNode = null;
  if (customMedia) {
    media = customMedia;
  } else if (illustration) {
    media = (
      <img
        className="dialog-illustration"
        src={illustration}
        alt=""
        height={128}
      />
    );
  } else if (Icon) {
    media = (
      <div className={`action-dialog__icon action-dialog__icon--${tone}`}>
        <Icon size={28} />
      </div>
    );
  }

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogPopup
        centered
        className={className}
        media={media}
        title={title}
        description={description}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="m"
              onClick={() => onOpenChange(false)}
            >
              <X size={16} />
              {cancelLabel}
            </Button>
            <Button
              type={formId ? "submit" : "button"}
              form={formId}
              variant="primary"
              size="m"
              className={
                isDestructive
                  ? "action-dialog__confirm--destructive"
                  : undefined
              }
              disabled={isLoading || isConfirmDisabled}
              onClick={formId ? undefined : onConfirm}
            >
              {isLoading ? (
                <Loader2 size={16} className="button__icon--spin" />
              ) : (
                <ConfirmIcon size={16} />
              )}
              {isLoading && loadingLabel ? loadingLabel : confirmLabel}
            </Button>
          </>
        }
      >
        {children}
      </DialogPopup>
    </DialogRoot>
  );
}
