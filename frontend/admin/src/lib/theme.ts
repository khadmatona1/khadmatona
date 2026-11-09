export type Theme = "light" | "dark";

const STORAGE_KEY = "khadmatona-theme";

// The site's actual default - a product choice, not the visitor's OS
// preference. A first-time visitor with nothing stored yet gets dark;
// light only applies once someone explicitly picks it via the toggle.
export const DEFAULT_THEME: Theme = "dark";

export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : null;
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem(STORAGE_KEY, theme);
}
