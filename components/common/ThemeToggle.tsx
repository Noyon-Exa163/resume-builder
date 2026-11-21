"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import {
  getServerThemeSnapshot,
  getThemeSnapshot,
  setTheme,
  subscribeTheme,
} from "@/lib/theme";
import "./ThemeToggle.css";

export interface ThemeToggleProps {
  className?: string;
}

/**
 * Segmented sun/moon pill: both modes stay visible and the active one sits
 * on a raised thumb, so the current mode reads at a glance. Each side is
 * its own button (labelled, aria-pressed) rather than one ambiguous
 * toggle. The theme comes from the store in lib/theme — the SSR snapshot
 * is "light" (matching the no-flash script's default) and the client
 * snapshot re-reads storage after hydration without cascading effects.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  const isDark = theme === "dark";

  return (
    <div
      className={["theme-toggle", className].filter(Boolean).join(" ")}
      role="group"
      aria-label="Theme"
    >
      <button
        type="button"
        className="theme-toggle__option"
        aria-pressed={!isDark}
        aria-label="Light Mode"
        title="Light Mode"
        onClick={() => setTheme("light")}
      >
        <Sun size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="theme-toggle__option"
        aria-pressed={isDark}
        aria-label="Dark Mode"
        title="Dark Mode"
        onClick={() => setTheme("dark")}
      >
        <Moon size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export default ThemeToggle;
