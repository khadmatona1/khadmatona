"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { modal } from "@/lib/modal";
import { ApiError } from "@/lib/api";
import { listVisits } from "@/lib/visits";
import { moroccoShortDateTimeFormatter } from "@/lib/morocco-time";
import { VisitDetailContent } from "@/components/visits/visit-detail-content";
import type { Visit, VisitStatus } from "@/types/visit";

const DOT_TONE: Record<VisitStatus, string> = {
  scheduled: "bg-gold-primary",
  completed: "bg-success",
  cancelled: "bg-text-muted",
  no_show: "bg-error",
};

/** Local calendar date key (YYYY-MM-DD), independent of any timezone
 * conversion - the grid itself is laid out in the viewer's own local dates;
 * only the displayed TIME per visit is Morocco-pinned (moroccoShortDateTimeFormatter). */
function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Hand-built month grid (Tailwind only, no calendar library - matches this
 * project's "everything hand-crafted" house style). Fetches the visible
 * month's visits via the from/to date-range filter and groups them by day.
 */
export function VisitsCalendar({ title, subtitle }: { title: string; subtitle: string }) {
  const t = useTranslations("DashboardVisits");
  const locale = useLocale();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      const from = new Date(month.getFullYear(), month.getMonth(), 1);
      const to = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      try {
        const result = await listVisits({
          from: dateKey(from),
          to: dateKey(to),
          perPage: 250,
        });
        if (!cancelled) setVisits(result.visits);
      } catch (caught) {
        if (!cancelled) modal.error(caught instanceof ApiError ? caught.message : t("genericError"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [month, t]);

  const visitsByDay = useMemo(() => {
    const map = new Map<string, Visit[]>();
    for (const visit of visits) {
      const key = dateKey(new Date(visit.scheduled_at));
      map.set(key, [...(map.get(key) ?? []), visit]);
    }
    return map;
  }, [visits]);

  const weekdayFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "short" }),
    [locale],
  );
  const weekdayNarrowFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "narrow" }),
    [locale],
  );
  const dayHeadingFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }),
    [locale],
  );

  // Monday-first grid, filled out to complete weeks on both ends.
  const days = useMemo(() => {
    const first = month;
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const leading = (first.getDay() + 6) % 7; // 0 = Monday
    const trailing = (7 - ((last.getDay() + 6) % 7) - 1) % 7;

    const cells: Date[] = [];
    for (let i = leading; i > 0; i--) cells.push(new Date(first.getFullYear(), first.getMonth(), 1 - i));
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(first.getFullYear(), first.getMonth(), d));
    for (let i = 1; i <= trailing; i++) cells.push(new Date(first.getFullYear(), first.getMonth() + 1, i));

    return cells;
  }, [month]);

  // A known Monday (2024-01-01), purely to derive locale weekday labels in order.
  const weekdayHeaders = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i));
  }, []);

  function handleUpdate(updated: Visit) {
    setVisits((current) => current.map((v) => (v.id === updated.id ? updated : v)));
  }

  function openDetail(visit: Visit) {
    modal.custom({
      content: <VisitDetailContent id={visit.id} onChange={handleUpdate} />,
    });
  }

  // On narrow screens each day cell is too tight for the full per-visit rows
  // (see the sm:hidden/sm:flex split below) - tapping the day instead opens
  // this agenda popup, which reuses the same openDetail() flow per visit.
  function openDayList(day: Date, dayVisits: Visit[]) {
    modal.custom({
      title: dayHeadingFormatter.format(day),
      content: (
        <div className="flex flex-col gap-2">
          {dayVisits
            .slice()
            .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
            .map((visit) => (
              <button
                key={visit.id}
                type="button"
                onClick={() => openDetail(visit)}
                className="flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-start text-sm text-text hover:border-gold-primary"
              >
                <span className={clsx("h-2 w-2 shrink-0 rounded-full", DOT_TONE[visit.status])} />
                <span className="font-semibold">
                  {moroccoShortDateTimeFormatter.format(new Date(visit.scheduled_at)).split(",").pop()}
                </span>
                <span className="truncate text-text-muted">{visit.lead_name ?? "—"}</span>
              </button>
            ))}
        </div>
      ),
    });
  }

  const monthFormatter = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="rounded-sm border-[1.5px] border-border-strong px-2.5 py-1.5 text-xs font-semibold text-text-muted hover:border-gold-primary hover:text-gold-primary sm:px-3 sm:text-sm"
          >
            {t("previousMonth")}
          </button>
          <button
            type="button"
            onClick={() => setMonth(startOfMonth(new Date()))}
            className="rounded-sm border-[1.5px] border-border-strong px-2.5 py-1.5 text-xs font-semibold text-text-muted hover:border-gold-primary hover:text-gold-primary sm:px-3 sm:text-sm"
          >
            {t("today")}
          </button>
          <button
            type="button"
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="rounded-sm border-[1.5px] border-border-strong px-2.5 py-1.5 text-xs font-semibold text-text-muted hover:border-gold-primary hover:text-gold-primary sm:px-3 sm:text-sm"
          >
            {t("nextMonth")}
          </button>
        </div>
        <p className="font-display text-base font-semibold text-text capitalize sm:text-lg">{monthFormatter.format(month)}</p>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-border bg-border">
        {weekdayHeaders.map((day, index) => (
          <div
            key={index}
            className="bg-surface-muted px-1 py-2 text-center text-[0.7rem] font-bold tracking-wide text-text-muted uppercase sm:px-2"
          >
            <span className="sm:hidden">{weekdayNarrowFormatter.format(day)}</span>
            <span className="hidden sm:inline">{weekdayFormatter.format(day)}</span>
          </div>
        ))}

        {days.map((day, index) => {
          const inMonth = day.getMonth() === month.getMonth();
          const dayVisits = visitsByDay.get(dateKey(day)) ?? [];
          const isToday = dateKey(day) === dateKey(new Date());

          return (
            <div
              key={index}
              onClick={() => dayVisits.length > 0 && openDayList(day, dayVisits)}
              className={clsx(
                "min-h-14 bg-surface p-1 sm:min-h-28 sm:p-1.5",
                !inMonth && "bg-surface-muted/50 text-text-muted",
                dayVisits.length > 0 && "cursor-pointer sm:cursor-default",
              )}
            >
              <span
                className={clsx(
                  "inline-flex h-5 w-5 items-center justify-center rounded-full text-[0.7rem] sm:text-[0.75rem]",
                  isToday ? "bg-gold-primary font-bold text-white" : "text-text-muted",
                )}
              >
                {day.getDate()}
              </span>

              {/* Mobile: dot-only summary, tap the whole cell (see onClick above) to open the day's agenda. */}
              <div className="mt-1 flex flex-wrap items-center gap-1 sm:hidden">
                {dayVisits.slice(0, 4).map((visit) => (
                  <span key={visit.id} className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", DOT_TONE[visit.status])} />
                ))}
                {dayVisits.length > 4 && (
                  <span className="text-[0.65rem] text-text-muted">+{dayVisits.length - 4}</span>
                )}
              </div>

              {/* sm+: full per-visit rows, each directly openable. */}
              <div className="mt-1 hidden flex-col gap-1 sm:flex">
                {dayVisits.slice(0, 3).map((visit) => (
                  <button
                    key={visit.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openDetail(visit);
                    }}
                    className="flex items-center gap-1 rounded-sm bg-surface-muted px-1.5 py-1 text-start text-[0.7rem] leading-tight text-text hover:bg-gold-primary/10"
                  >
                    <span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", DOT_TONE[visit.status])} />
                    <span className="truncate">
                      {moroccoShortDateTimeFormatter.format(new Date(visit.scheduled_at)).split(",").pop()} — {visit.lead_name ?? "—"}
                    </span>
                  </button>
                ))}
                {dayVisits.length > 3 && (
                  <span className="px-1.5 text-[0.7rem] text-text-muted">{t("more", { count: dayVisits.length - 3 })}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isLoading && <p className="text-sm text-text-muted">{t("loading")}</p>}
    </div>
  );
}
