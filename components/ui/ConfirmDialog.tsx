"use client";

import { DialogRoot, DialogPopup } from "./Dialog";
import Button from "./Button";
import "./ConfirmDialog.css";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isDestructive?: boolean;
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  isDestructive = true,
}: ConfirmDialogProps) {
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogPopup
        title={title}
        description={description}
        footer={
          <>
            <Button
              variant="secondary"
              size="s"
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              variant="primary"
              size="s"
              className={
                isDestructive ? "confirm-dialog__confirm--destructive" : undefined
              }
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </Button>
          </>
        }
      />
    </DialogRoot>
  );
}
