"use client";

import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/Tooltip";

/**
 * Client-side providers that wrap the whole app. TooltipProvider shares
 * open-delay so moving between adjacent icon buttons shows the next hint
 * instantly after the first one appears.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return <TooltipProvider delay={200}>{children}</TooltipProvider>;
}
