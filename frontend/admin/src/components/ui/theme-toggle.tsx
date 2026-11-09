"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { applyTheme, DEFAULT_THEME, getStoredTheme, type Theme } from "@/lib/theme";

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="4.2" />
      <path
        d="M12 3v2m0 14v2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M3 12h2m14 0h2M4.2 19.8l1.4-1.4m12.8-12.8 1.4-1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path
        d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.7 6.7 0 0 0 10.5 10.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThemeToggle({
  variant = "default",
}: {
  /** "onDark"/"onLight" are for permanently-fixed chrome (e.g. the public
   * navbar) where theme-token-based default colors wouldn't have enough
   * contrast - these use the raw invariant brand colors instead of the
   * data-theme-reactive semantic tokens, so they stay correct even when
   * the page itself is toggled to the opposite theme. */
  variant?: "default" | "onDark" | "onLight";
}) {
  const t = useTranslations("Theme");
  // Starts null (server-rendered default) - the inline no-flash script in
  // <head> already set the real attribute before paint, this just syncs
  // React's own state to it after mount so the icon reflects reality.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    function sync() {
      setTheme(getStoredTheme() ?? DEFAULT_THEME);
    }
    sync();
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? t("toggleToLight") : t("toggleToDark")}
      className={clsx(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors",
        variant === "onDark" && "text-white/70 hover:bg-white/10 hover:text-white",
        variant === "onLight" && "text-charcoal/70 hover:bg-mist hover:text-ink",
        variant === "default" && "text-text-muted hover:bg-surface-muted hover:text-text",
      )}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
