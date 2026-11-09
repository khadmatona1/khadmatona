import { MOROCCO_TZ } from "@/lib/morocco-time";

/**
 * Intl locale for a UI locale. Arabic uses the Moroccan region with Latin
 * digits: the rest of the admin shows Western digits in every language,
 * and "ar" alone would switch numbers and dates to Eastern Arabic digits.
 */
export function intlLocale(locale: string): string {
  if (locale === "ar") return "ar-MA-u-nu-latn";
  if (locale === "en") return "en-GB";
  return "fr-FR";
}

const DURATION_UNITS: Record<string, { h: string; min: string; s: string }> = {
  fr: { h: "h", min: "min", s: "s" },
  en: { h: "h", min: "min", s: "s" },
  ar: { h: "س", min: "د", s: "ث" },
};

/** "2 min 05 s" / "2 د 05 ث": compact, with each locale's own unit labels. */
export function formatDuration(seconds: number | null | undefined, locale: string): string {
  if (seconds === null || seconds === undefined) return "—";
  const units = DURATION_UNITS[locale] ?? DURATION_UNITS.fr;
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours} ${units.h} ${String(minutes).padStart(2, "0")} ${units.min}`;
  if (minutes > 0) return `${minutes} ${units.min} ${String(secs).padStart(2, "0")} ${units.s}`;
  return `${secs} ${units.s}`;
}

export function formatPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(intlLocale(locale), { style: "percent", maximumFractionDigits: 1 }).format(value / 100);
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(intlLocale(locale)).format(value);
}

/** "24 sept." / "24 شتنبر" for a local "YYYY-MM-DD" day (noon UTC, so no timezone can shift it). */
export function formatDay(day: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${day}T12:00:00Z`),
  );
}

export function formatDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: MOROCCO_TZ,
  }).format(new Date(iso));
}

/** Country flag emoji from an ISO alpha-2 code ("MA" -> 🇲🇦). */
export function countryFlag(code: string | null): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65));
}

/** Localized country name ("MA" -> "Maroc" / "المغرب" / "Morocco"), falling back to the code. */
export function countryName(code: string | null, locale: string): string {
  if (!code) return "";
  try {
    return new Intl.DisplayNames([intlLocale(locale)], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
