"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";
import "./ThemeToggle.css";

export interface ThemeToggleProps {
  className?: string;
}

/**
 * Icon button that switches between light and dark mode. Renders the icon
 * for the mode you would switch TO (moon in light mode, sun in dark mode).
 * State syncs from storage after mount; the no-flash script in the root
 * layout guarantees the document class is correct before first paint.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(getStoredTheme() ?? "light");
  }, []);

  function handleToggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={["theme-toggle", className].filter(Boolean).join(" ")}
      onClick={handleToggle}
      aria-label={isDark ? "Switch To Light Mode" : "Switch To Dark Mode"}
      aria-pressed={isDark}
      title={isDark ? "Switch To Light Mode" : "Switch To Dark Mode"}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export default ThemeToggle;
