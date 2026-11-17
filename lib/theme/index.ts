/**
 * Theme mode (light/dark) — single owner of the `dark` class on <html>.
 *
 * The class is what every stylesheet keys off (styles/tokens.css `.dark`
 * overrides). Choice persists in localStorage; the default is light. An
 * inline script in app/layout.tsx applies the stored choice before first
 * paint so there is no flash of the wrong theme.
 */

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "exaresume-theme";

export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage unavailable (e.g. private mode) — the class still applies
    // for this session; persistence silently degrades.
  }
}
