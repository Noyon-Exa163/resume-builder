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

/**
 * Reactive view of the theme for React components (`useSyncExternalStore`):
 * a cached snapshot plus the listeners to notify on change. The snapshot is
 * cached — useSyncExternalStore requires getSnapshot to return the same
 * value between changes.
 */
let cachedTheme: Theme | null = null;
const listeners = new Set<() => void>();

function emitThemeChange(): void {
  for (const listener of listeners) listener();
}

export function subscribeTheme(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  // First subscriber also watches for other tabs changing the stored theme.
  if (typeof window !== "undefined" && listeners.size === 1) {
    window.addEventListener("storage", (event) => {
      if (event.key === THEME_STORAGE_KEY) {
        cachedTheme = getStoredTheme() ?? "light";
        emitThemeChange();
      }
    });
  }
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getThemeSnapshot(): Theme {
  if (cachedTheme === null) cachedTheme = getStoredTheme() ?? "light";
  return cachedTheme;
}

/** SSR snapshot — matches the no-flash script's light default. */
export function getServerThemeSnapshot(): Theme {
  return "light";
}

/** Sets the theme everywhere: the html class, persistence, and every
 *  subscribed component. */
export function setTheme(theme: Theme): void {
  cachedTheme = theme;
  applyTheme(theme);
  emitThemeChange();
}
