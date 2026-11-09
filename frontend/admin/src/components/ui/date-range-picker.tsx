"use client";

import * as Popover from "@radix-ui/react-popover";
import clsx from "clsx";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

/** "YYYY-MM-DD" calendar days. All math is done on UTC dates, so no timezone can shift a day. */
export interface DateRange {
  from: string;
  to: string;
}

function intlLocale(locale: string): string {
  if (locale === "ar") return "ar-MA-u-nu-latn";
  if (locale === "en") return "en-GB";
  return "fr-FR";
}

function toDate(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(day: string, days: number): string {
  const date = toDate(day);
  date.setUTCDate(date.getUTCDate() + days);
  return toDay(date);
}

/** Monday-first grid of 6 weeks for the month containing `monthDay`. */
function monthGrid(monthDay: string): string[] {
  const first = toDate(`${monthDay.slice(0, 7)}-01`);
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const start = addDays(toDay(first), -mondayOffset);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

/** Today as "YYYY-MM-DD" (UTC calendar day - only used to pick a default month and mark today). */
function todayIso(): string {
  return toDay(new Date());
}

function shiftMonth(monthDay: string, months: number): string {
  const date = toDate(`${monthDay.slice(0, 7)}-01`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return toDay(date);
}

/**
 * One calendar for a from-to range: the first click sets the start, the
 * second click sets the end (in either order), then the range is applied
 * and the calendar closes. Nothing is applied while only one date is
 * picked, so a list never reloads on a half-chosen range.
 */
export function DateRangePicker({
  label,
  value,
  max,
  initialMonth,
  onChange,
}: {
  label: string;
  value: DateRange | null;
  /** Latest selectable day ("YYYY-MM-DD"), e.g. today in Morocco for a
   * past-period filter. Omit for future dates (bookings): nothing is
   * disabled and the past-period presets are hidden. */
  max?: string;
  /** Month shown first when nothing is selected yet (defaults to max, else today). */
  initialMonth?: string;
  onChange: (range: DateRange | null) => void;
}) {
  const t = useTranslations("DateRangePicker");
  const locale = intlLocale(useLocale());
  const [open, setOpen] = useState(false);
  const todayDay = todayIso();
  const startMonth = value?.from ?? initialMonth ?? max ?? todayDay;
  const [month, setMonth] = useState(startMonth);
  const [start, setStart] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const dayFormatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" });
  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" });
  const formatDay = (day: string) => dayFormatter.format(toDate(day));

  // While picking, preview the range between the first click and the hovered day.
  const [rangeFrom, rangeTo] = start
    ? [start, hovered ?? start].sort()
    : value
      ? [value.from, value.to]
      : [null, null];

  function handleOpenChange(next: boolean) {
    setOpen(next);
    setStart(null);
    setHovered(null);
    if (next) setMonth(startMonth);
  }

  function apply(range: DateRange | null) {
    onChange(range);
    handleOpenChange(false);
  }

  function pick(day: string) {
    if (!start) {
      setStart(day);
      return;
    }
    const [from, to] = [start, day].sort();
    apply({ from, to });
  }

  const presets: Array<{ key: string; range: DateRange }> = max
    ? [
        { key: "last7", range: { from: addDays(max, -6), to: max } },
        { key: "last30", range: { from: addDays(max, -29), to: max } },
        { key: "thisMonth", range: { from: `${max.slice(0, 7)}-01`, to: max } },
      ]
    : [];

  const nextMonthDisabled = max !== undefined && shiftMonth(month, 1) > max;
  const currentMonth = month.slice(0, 7);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-bold text-text">{label}</span>
      <div className="flex items-center gap-1">
        <Popover.Root open={open} onOpenChange={handleOpenChange}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className={clsx(
                "flex min-w-[15rem] items-center gap-2 rounded-sm border-[1.5px] bg-surface px-3.5 py-2.5 text-start text-[0.95rem]",
                "hover:border-gold-primary focus-visible:border-gold-primary",
                open ? "border-gold-primary" : "border-border-strong",
              )}
            >
              <CalendarDays className="h-4 w-4 shrink-0 text-gold-primary" aria-hidden="true" />
              {value ? (
                <span className="text-text">
                  <bdi>{formatDay(value.from)}</bdi> – <bdi>{formatDay(value.to)}</bdi>
                </span>
              ) : (
                <span className="text-text-muted">{t("placeholder")}</span>
              )}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={6}
              className="combobox-content z-50 w-[19rem] rounded-md border border-border-strong bg-surface p-3 shadow-lg outline-none"
            >
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMonth(shiftMonth(month, -1))}
                  aria-label={t("previousMonth")}
                  className="rounded-sm p-1.5 text-text-muted hover:bg-surface-muted hover:text-text"
                >
                  <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
                </button>
                <p className="text-sm font-bold text-text first-letter:uppercase">{monthFormatter.format(toDate(month))}</p>
                <button
                  type="button"
                  onClick={() => setMonth(shiftMonth(month, 1))}
                  disabled={nextMonthDisabled}
                  aria-label={t("nextMonth")}
                  className="rounded-sm p-1.5 text-text-muted hover:bg-surface-muted hover:text-text disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
                </button>
              </div>

              <div className="grid grid-cols-7 text-center text-[0.7rem] font-bold text-text-muted uppercase">
                {monthGrid("2024-01-01").slice(0, 7).map((day) => (
                  <span key={day} className="py-1">{weekdayFormatter.format(toDate(day))}</span>
                ))}
              </div>
              <div className="grid grid-cols-7" onMouseLeave={() => setHovered(null)}>
                {monthGrid(month).map((day) => {
                  const outside = day.slice(0, 7) !== currentMonth;
                  const disabled = max !== undefined && day > max;
                  const inRange = rangeFrom !== null && rangeTo !== null && day >= rangeFrom && day <= rangeTo;
                  const isEdge = day === rangeFrom || day === rangeTo;
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={disabled}
                      onClick={() => pick(day)}
                      onMouseEnter={() => setHovered(day)}
                      aria-pressed={isEdge}
                      aria-label={formatDay(day)}
                      className={clsx(
                        "h-9 text-sm tabular-nums transition-colors",
                        disabled && "cursor-not-allowed text-text-muted/40",
                        !disabled && outside && !inRange && "text-text-muted/60",
                        !disabled && !outside && !inRange && "text-text",
                        inRange && !isEdge && "bg-gold-primary/15 text-text",
                        isEdge && "rounded-sm bg-gold-primary font-bold text-white",
                        !disabled && !isEdge && "hover:rounded-sm hover:bg-surface-muted",
                        day === (max ?? todayDay) && !isEdge && "font-bold underline decoration-gold-primary underline-offset-4",
                      )}
                    >
                      {Number(day.slice(8))}
                    </button>
                  );
                })}
              </div>

              <p className="mt-2 min-h-[1.1rem] text-[0.75rem] text-text-muted" role="status">
                {start ? t("pickEnd", { date: formatDay(start) }) : t("pickStart")}
              </p>

              {presets.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border pt-2">
                {presets.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => apply(preset.range)}
                    className="rounded-full border border-border px-2.5 py-1 text-[0.75rem] font-semibold text-text-muted hover:border-gold-primary hover:text-gold-primary"
                  >
                    {t(`presets.${preset.key}`)}
                  </button>
                ))}
              </div>
              )}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        {value && (
          <button
            type="button"
            onClick={() => apply(null)}
            aria-label={t("clear")}
            title={t("clear")}
            className="rounded-sm p-2 text-text-muted hover:bg-surface-muted hover:text-error"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
