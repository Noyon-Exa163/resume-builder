"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import { Tooltip } from "./Tooltip";
import "./Dialog.css";

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const DialogRoot = Dialog.Root;

const DialogTrigger = forwardRef<
  HTMLButtonElement,
  Dialog.Trigger.Props
>(({ ...rest }, ref) => <Dialog.Trigger ref={ref} {...rest} />);
DialogTrigger.displayName = "DialogTrigger";

function DialogPopup({
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  return (
    <Dialog.Portal>
      <Dialog.Backdrop className="dialog-backdrop" />
      <Dialog.Popup
        className={["dialog-popup", className].filter(Boolean).join(" ")}
      >
        <div className="dialog-header">
          {title && <Dialog.Title className="dialog-title">{title}</Dialog.Title>}
          <Tooltip label="Close">
            <Dialog.Close className="dialog-close" aria-label="Close dialog">
              <X size={18} />
            </Dialog.Close>
          </Tooltip>
        </div>
        {description && (
          <Dialog.Description className="dialog-description">
            {description}
          </Dialog.Description>
        )}
        {children && <div className="dialog-body">{children}</div>}
        {footer && <div className="dialog-footer">{footer}</div>}
      </Dialog.Popup>
    </Dialog.Portal>
  );
}

export { DialogRoot, DialogTrigger, DialogPopup };
