"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { listManagedProperties } from "@/lib/rental";
import { MOROCCO_TZ } from "@/lib/morocco-time";
import type {
  CleaningStatus,
  MaintenancePriority,
  MaintenanceStatus,
  ManagedProperty,
  ReservationStatus,
} from "@/types/rental";

// --- Formatting --------------------------------------------------------------

function intlLocale(locale: string): string {
  if (locale === "ar") return "ar-MA-u-nu-latn";
  if (locale === "en") return "en-GB";
  return "fr-FR";
}

/** Formatters bound to the current UI locale: money in MAD, calendar days, months. */
export function useRentalFormat() {
  const locale = intlLocale(useLocale());
  const money = new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const month = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" });

  return {
    money: (value: number) => `${money.format(value)} DH`,
    day: (value: string | null) => (value ? day.format(new Date(`${value.slice(0, 10)}T00:00:00Z`)) : "—"),
    month: (value: string) => month.format(new Date(`${value}-01T00:00:00Z`)),
  };
}

/** "YYYY-MM-DD" today, in Morocco time (the backend's business day). */
export function businessToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MOROCCO_TZ }).format(new Date());
}

export function shiftMonth(month: string, delta: number): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 7);
}

// --- Navigation ----------------------------------------------------------------

const SECTIONS = [
  { href: "/dashboard/rental", key: "overview" },
  { href: "/dashboard/rental/reservations", key: "reservations" },
  { href: "/dashboard/rental/cleaning", key: "cleaning" },
  { href: "/dashboard/rental/maintenance", key: "maintenance" },
  { href: "/dashboard/rental/finances", key: "finances" },
  { href: "/dashboard/rental/properties", key: "properties" },
] as const;

/** Page header + section tabs shared by every Gestion locative page. */
export function RentalShell({ title, subtitle, action, children }: { title: string; subtitle: string; action?: ReactNode; children: ReactNode }) {
  const t = useTranslations("Rental");
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-bold tracking-wide text-gold-primary uppercase">{t("moduleTitle")}</p>
          <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
        </div>
        {action}
      </div>
      <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1" aria-label={t("moduleTitle")}>
        {SECTIONS.map((section) => {
          const active = pathname === section.href;
          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
                active ? "border-gold-primary text-gold-primary" : "border-transparent text-text-muted hover:text-text",
              )}
            >
              {t(`nav.${section.key}`)}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}

// --- Month picker ----------------------------------------------------------------

export function MonthPicker({ value, onChange }: { value: string; onChange: (month: string) => void }) {
  const t = useTranslations("Rental");
  const format = useRentalFormat();

  return (
    <div className="flex items-center gap-1 rounded-sm border-[1.5px] border-border-strong bg-surface px-1 py-1">
      <button type="button" onClick={() => onChange(shiftMonth(value, -1))} aria-label={t("previousMonth")} className="rounded-sm p-1.5 text-text-muted hover:bg-surface-muted hover:text-text">
        <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
      </button>
      <span className="min-w-[9rem] text-center text-sm font-semibold text-text first-letter:uppercase">{format.month(value)}</span>
      <button type="button" onClick={() => onChange(shiftMonth(value, 1))} aria-label={t("nextMonth")} className="rounded-sm p-1.5 text-text-muted hover:bg-surface-muted hover:text-text">
        <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
      </button>
    </div>
  );
}

// --- Badges ------------------------------------------------------------------------

const RESERVATION_TONES = { confirmed: "info", checked_in: "gold", checked_out: "success", cancelled: "neutral" } as const;
const CLEANING_TONES = { pending: "warning", done: "success", cancelled: "neutral" } as const;
const MAINTENANCE_TONES = { open: "warning", in_progress: "info", resolved: "success", cancelled: "neutral" } as const;
const PRIORITY_TONES = { low: "neutral", normal: "info", urgent: "error" } as const;

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  const t = useTranslations("Rental");
  return <Badge tone={RESERVATION_TONES[status]}>{t(`reservationStatus.${status}`)}</Badge>;
}

export function CleaningStatusBadge({ status }: { status: CleaningStatus }) {
  const t = useTranslations("Rental");
  return <Badge tone={CLEANING_TONES[status]}>{t(`cleaningStatus.${status}`)}</Badge>;
}

export function MaintenanceStatusBadge({ status }: { status: MaintenanceStatus }) {
  const t = useTranslations("Rental");
  return <Badge tone={MAINTENANCE_TONES[status]}>{t(`maintenanceStatus.${status}`)}</Badge>;
}

export function PriorityBadge({ priority }: { priority: MaintenancePriority }) {
  const t = useTranslations("Rental");
  return <Badge tone={PRIORITY_TONES[priority]}>{t(`priority.${priority}`)}</Badge>;
}

// --- Data ----------------------------------------------------------------------------

/**
 * Every managed property, for pickers and filters (a management portfolio
 * is small: one page of 100 covers it). `activeOnly` hides properties no
 * longer under management for new bookings/costs.
 */
export function useManagedProperties(activeOnly = false) {
  const [items, setItems] = useState<ManagedProperty[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listManagedProperties({ perPage: 100, sort: "property_id", filters: activeOnly ? { is_active: 1 } : {} })
      .then((page) => {
        if (!cancelled) setItems(page.items);
      })
      .catch(() => {
        // Non-blocking: pickers just stay empty.
      });
    return () => {
      cancelled = true;
    };
  }, [activeOnly, version]);

  return { items, reload: () => setVersion((v) => v + 1) };
}

export function propertyLabel(property: { property_id: number; property_title: string | null }): string {
  return `#${property.property_id} ${property.property_title ?? ""}`.trim();
}

/** A labelled empty state inside a card/table area. */
export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-surface-muted p-8 text-center">
      <p className="font-display text-lg font-semibold text-text">{title}</p>
      {body && <p className="mt-1 text-sm text-text-muted">{body}</p>}
    </div>
  );
}
