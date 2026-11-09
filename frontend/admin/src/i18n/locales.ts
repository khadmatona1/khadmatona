// Pure constants only - no `next/headers` import here, so this file is
// safe to import from client components too (unlike request.ts, which
// would break client bundling if imported outside a Server Component).
export const SUPPORTED_LOCALES = ["fr", "en", "ar"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

// Matches the backend's APP_FALLBACK_LOCALE=fr (CLAUDE.md §17).
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isSupportedLocale(value: string | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Respect a saved choice, then the browser's language list and quality weights. */
export function resolveLocale(saved: string | undefined, acceptLanguage: string): Locale {
  if (isSupportedLocale(saved)) return saved;
  const preferences = acceptLanguage.split(",").map((entry, index) => {
    const [tag, ...parameters] = entry.trim().split(";");
    const weight = parameters.find((parameter) => parameter.trim().startsWith("q="));
    const quality = weight ? Number(weight.trim().slice(2)) : 1;
    return { locale: tag.trim().toLowerCase().split(/[-_]/)[0], quality, index };
  }).filter((entry) => Number.isFinite(entry.quality) && entry.quality > 0 && entry.quality <= 1)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  return preferences.find((entry) => isSupportedLocale(entry.locale))?.locale as Locale ?? DEFAULT_LOCALE;
}
