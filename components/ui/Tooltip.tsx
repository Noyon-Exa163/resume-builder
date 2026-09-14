"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { type ReactElement, type ReactNode } from "react";
import "./Tooltip.css";

export const TooltipProvider = BaseTooltip.Provider;

export interface TooltipProps {
  label: ReactNode;
  children: ReactElement;
  side?: "top" | "bottom" | "left" | "right";
}

/**
 * Hover/focus label for icon-only and otherwise unlabeled controls.
 * Portals out of overflow containers (chat transcript, dialogs, etc.).
 * The trigger is always a wrapping span so disabled buttons still show a
 * tooltip (native disabled elements swallow pointer events) and so the
 * trigger identity stays stable if `disabled` flips.
 */
export function Tooltip({ label, children, side = "top" }: TooltipProps) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={<span className="tooltip-trigger" />}>
        {children}
      </BaseTooltip.Trigger>
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner
          className="tooltip-positioner"
          side={side}
          sideOffset={6}
        >
          <BaseTooltip.Popup className="tooltip-popup">{label}</BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}

export interface TooltipProviderProps {
  children?: ReactNode;
  delay?: number;
  closeDelay?: number;
  timeout?: number;
}
