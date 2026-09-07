"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import "./Collapsible.css";

export interface CollapsibleSectionProps {
  label: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

export default function CollapsibleSection({
  label,
  defaultOpen,
  open,
  onOpenChange,
  children,
  className,
}: CollapsibleSectionProps) {
  return (
    <Collapsible.Root
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
      className={["collapsible-section", className].filter(Boolean).join(" ")}
    >
      <Collapsible.Trigger className="collapsible-section__trigger">
        <ChevronDown size={16} className="collapsible-section__chevron" />
        {label}
      </Collapsible.Trigger>
      <Collapsible.Panel className="collapsible-section__panel" keepMounted>
        <div className="collapsible-section__content">{children}</div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
