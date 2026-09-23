"use client";

import { Drawer as BaseDrawer } from "@base-ui/react/drawer";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import "./Drawer.css";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Announced to screen readers; not shown visually. */
  title: string;
  children: ReactNode;
}

/**
 * Panel that slides in from the left edge — the app navigation on narrow
 * screens. Swipe left, Escape, or a backdrop tap closes it; focus is
 * trapped while open (Base UI).
 */
export function Drawer({ open, onOpenChange, title, children }: DrawerProps) {
  return (
    <BaseDrawer.Root
      open={open}
      onOpenChange={onOpenChange}
      swipeDirection="left"
    >
      <BaseDrawer.Portal>
        <BaseDrawer.Backdrop className="drawer__backdrop" />
        <BaseDrawer.Viewport className="drawer__viewport">
          <BaseDrawer.Popup className="drawer">
            <div className="drawer__header">
              <BaseDrawer.Title className="drawer__title">
                {title}
              </BaseDrawer.Title>
              <BaseDrawer.Close className="drawer__close" aria-label="Close Menu">
                <X size={18} />
              </BaseDrawer.Close>
            </div>
            <BaseDrawer.Content className="drawer__content">
              {children}
            </BaseDrawer.Content>
          </BaseDrawer.Popup>
        </BaseDrawer.Viewport>
      </BaseDrawer.Portal>
    </BaseDrawer.Root>
  );
}

export default Drawer;
