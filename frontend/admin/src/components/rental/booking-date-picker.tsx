"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import * as Popover from "@radix-ui/react-popover";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const date = (day: string) => new Date(`${day}T00:00:00Z`);
const iso = (value: Date) => value.toISOString().slice(0, 10);
function monthAt(day: string, offset: number) {
  const value = date(`${day.slice(0, 7)}-01`);
  value.setUTCMonth(value.getUTCMonth() + offset);
  return iso(value);
}
function monthDays(month: string) {
  const first = date(month);
  const padding = (first.getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return [...Array<string | null>(padding).fill(null), ...Array.from({ length }, (_, index) => `${month.slice(0, 7)}-${String(index + 1).padStart(2, "0")}`)];
}

export function BookingDatePicker({ checkIn, checkOut, min, max, onChange, errors }: {
  checkIn: string; checkOut: string; min: string; max: string;
  onChange: (from: string, to: string) => void;
  errors: Record<string, string>;
}) {
  const t = useTranslations("Booking");
  const calendar = useTranslations("DateRangePicker");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(monthAt(checkIn || min, 0));
  const [selecting, setSelecting] = useState<"from" | "to">("from");
  const [hovered, setHovered] = useState("");
  const opener = useRef<HTMLButtonElement | null>(null);
  const format = (day: string) => day ? new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date(day)) : t("addDates");
  const nights = checkIn && checkOut > checkIn ? Math.round((date(checkOut).getTime() - date(checkIn).getTime()) / 86400000) : 0;
  function pick(day: string) {
    if (selecting === "from" || !checkIn || day <= checkIn) {
      onChange(day, checkOut > day ? checkOut : "");
      setSelecting("to");
    } else {
      onChange(checkIn, day);
      setSelecting("from");
    }
    setHovered("");
  }
  const previewEnd = selecting === "to" && hovered > checkIn ? hovered : checkOut;
  return (
    <Popover.Root open={open} onOpenChange={(next) => { setOpen(next); if (next) { setMonth(monthAt(checkIn || min, 0)); setHovered(""); } }}>
      <Popover.Anchor asChild>
        <div className="grid grid-cols-2 divide-x divide-border rtl:divide-x-reverse">
          {(["from", "to"] as const).map((part) => (
            <button key={part} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={(event) => { opener.current = event.currentTarget; setSelecting(part); setMonth(monthAt(checkIn || min, 0)); setOpen(true); }} className="min-w-0 px-3 py-2.5 text-start focus-visible:outline-offset-[-3px]">
              <span className="block text-[10px] font-bold uppercase">{t(part === "from" ? "checkIn" : "checkOut")}</span>
              <span className="mt-0.5 block text-sm">{format(part === "from" ? checkIn : checkOut)}</span>
            </button>
          ))}
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content aria-label={t("selectDates")} onCloseAutoFocus={(event) => { event.preventDefault(); opener.current?.focus(); }} align="end" side="bottom" sideOffset={8} collisionPadding={16} className="booking-widget z-50 max-h-[var(--radix-popover-content-available-height)] w-[min(660px,calc(100vw-2rem))] overflow-y-auto rounded-2xl p-5 border border-border shadow-lg sm:p-7">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div aria-live="polite">
              <h3 className="text-xl font-semibold">{nights ? t("nights", { count: nights }) : t("selectDates")}</h3>
              <p className="mt-1 text-sm text-text-muted">{checkIn ? `${format(checkIn)} – ${format(checkOut)}` : calendar("pickStart")}</p>
            </div>
            <div className="grid w-full grid-cols-2 rounded-[8px] border border-border sm:w-[316px]">
              {(["from", "to"] as const).map((part) => (
                <div key={part} className={`relative flex min-h-14 min-w-0 items-center ${part === "to" ? "border-s border-border" : ""} ${selecting === part ? "z-10 rounded-[6px] outline-2 outline-gold-primary" : ""}`}>
                  <button type="button" onClick={() => setSelecting(part)} aria-pressed={selecting === part} className="min-h-14 min-w-0 flex-1 py-2 ps-3 pe-8 text-start">
                    <span className="block text-[9px] font-bold uppercase">{t(part === "from" ? "checkIn" : "checkOut")}</span>
                    <span className="mt-0.5 block text-sm">{format(part === "from" ? checkIn : checkOut)}</span>
                  </button>
                  {(part === "from" ? checkIn : checkOut) && <button type="button" aria-label={`${calendar("clear")} · ${t(part === "from" ? "checkIn" : "checkOut")}`} onClick={() => { onChange(part === "from" ? "" : checkIn, part === "to" ? "" : checkOut); setSelecting(part); setHovered(""); }} className="absolute end-2 rounded-full p-1 hover:bg-surface-muted"><X size={14} /></button>}
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <button type="button" aria-label={calendar("previousMonth")} disabled={month <= monthAt(min, 0)} onClick={() => setMonth(monthAt(month, -1))} className="absolute start-0 top-0 rounded-full p-1.5 hover:bg-surface-muted disabled:opacity-25"><ChevronLeft size={18} className="rtl:rotate-180" /></button>
            <button type="button" aria-label={calendar("nextMonth")} disabled={monthAt(month, 1) > max} onClick={() => setMonth(monthAt(month, 1))} className="absolute end-0 top-0 rounded-full p-1.5 hover:bg-surface-muted disabled:opacity-25"><ChevronRight size={18} className="rtl:rotate-180" /></button>
            <div className="grid gap-6 sm:grid-cols-2">
              {[0, 1].map((offset) => {
                const current = monthAt(month, offset);
                return <section key={current} aria-label={new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(date(current))}>
                  <h4 className="mb-5 py-1.5 text-center text-sm font-semibold capitalize">{new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(date(current))}</h4>
                  <div className="grid grid-cols-7 text-center text-xs text-text-muted">{Array.from({ length: 7 }, (_, index) => <span key={index} className="pb-3">{new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 1 + index)))}</span>)}</div>
                  <div className="grid grid-cols-7" onMouseLeave={() => setHovered("")}>
                    {monthDays(current).map((day, index) => {
                      if (!day) return <span key={`blank-${index}`} />;
                      const selected = day === checkIn || day === checkOut;
                      const inRange = checkIn && previewEnd && day > checkIn && day < previewEnd;
                      return <div key={day} className={inRange ? "bg-gold-primary/10" : ""}><button type="button" disabled={day < min || day > max} aria-label={new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "UTC" }).format(date(day))} aria-pressed={selected} onMouseEnter={() => setHovered(day)} onFocus={() => setHovered(day)} onClick={() => pick(day)} className={`aspect-square w-full rounded-full text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-primary disabled:text-text-muted disabled:opacity-35 disabled:line-through ${selected ? "bg-gradient-gold text-ink" : "hover:ring-1 hover:ring-inset hover:ring-gold-primary"}`}>{Number(day.slice(-2))}</button></div>;
                    })}
                  </div>
                </section>;
              })}
            </div>
          </div>
          {(errors.check_in_date || errors.check_out_date) && <p role="alert" className="mt-3 text-sm text-error">{errors.check_in_date || errors.check_out_date}</p>}
          <div className="mt-6 flex items-center justify-end gap-6">
            <button type="button" onClick={() => { onChange("", ""); setSelecting("from"); setHovered(""); }} className="text-sm underline underline-offset-2">{calendar("clear")}</button>
            <Popover.Close className="rounded-lg bg-gradient-gold px-5 py-2 text-sm font-semibold text-ink">{t("closeCalendar")}</Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
