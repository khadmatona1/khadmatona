/**
 * "Morocco time" for every wall-clock date/time in the app. Anything that lets an
 * agent pick a wall-clock time (e.g. "call back at 18:00") must mean
 * Morocco's actual local time at that moment, not whatever timezone the
 * agent's own laptop/phone happens to be set to - a `datetime-local` input
 * and native `Date`/`Intl` formatting both silently use the DEVICE's system
 * timezone otherwise, which is wrong the moment a tester's machine (or a
 * traveling agent's phone) isn't set to Morocco time.
 *
 * MOROCCO_TZ is the single switch, and must match the backend's
 * config('app.business_timezone') (BUSINESS_TIMEZONE):
 *  - "UTC" (default): Morocco on GMT, the current legal time.
 *  - "Africa/Casablanca": the IANA rule (UTC+1, GMT during Ramadan).
 * Offsets are always computed through Intl for the given instant, never
 * hardcoded, so either value works through any transition.
 */
export const MOROCCO_TZ = process.env.NEXT_PUBLIC_BUSINESS_TIMEZONE || "UTC";

/** Morocco's UTC offset in minutes at the given instant (per MOROCCO_TZ). */
function moroccoOffsetMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MOROCCO_TZ,
    timeZoneName: "longOffset",
  }).formatToParts(instant);

  const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+00:00";
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(raw);
  if (!match) return 0;

  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

/**
 * Converts a wall-clock date+time (as typed into a `datetime-local` input,
 * e.g. "2026-03-15T18:00") into the UTC instant that same wall-clock time
 * represents IN MOROCCO - regardless of the browser's own system timezone.
 */
export function moroccoLocalToIso(datetimeLocalValue: string): string {
  const [datePart, timePart] = datetimeLocalValue.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = (timePart ?? "00:00").split(":").map(Number);

  // Treat the typed numbers as UTC first (no timezone applied yet), then
  // subtract Morocco's offset for that same clock reading to get the real
  // UTC instant - two passes because the offset itself depends on the date
  // (Ramadan window), and a single ~1h correction never crosses that window.
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  const offset = moroccoOffsetMinutes(new Date(asUtc));

  return new Date(asUtc - offset * 60_000).toISOString();
}

/** The `datetime-local` input value representing "now" in Morocco. */
export function nowAsMoroccoLocalInput(): string {
  return isoToMoroccoLocalInput(new Date().toISOString());
}

/** An ISO instant as the `datetime-local` value showing Morocco's wall-clock time for it. */
export function isoToMoroccoLocalInput(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MOROCCO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Formats an ISO instant as Morocco local time, regardless of the viewer's own device timezone. */
export const moroccoDateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: MOROCCO_TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export const moroccoShortDateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: MOROCCO_TZ,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
