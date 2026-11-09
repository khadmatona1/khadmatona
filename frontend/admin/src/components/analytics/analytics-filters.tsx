"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/select";
import { MOROCCO_TZ } from "@/lib/morocco-time";
import {
  DEVICE_TYPES,
  REPORTABLE_EVENTS,
  TRACKED_FORMS,
  TRAFFIC_SOURCES,
  type AnalyticsFilters,
  type AnalyticsRange,
} from "@/types/analytics";

const RANGES: AnalyticsRange[] = ["today", "yesterday", "7d", "30d", "custom"];

/** "YYYY-MM-DD" in the business timezone (the backend's day boundaries), N days ago. */
function businessDate(daysAgo = 0): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MOROCCO_TZ }).format(
    new Date(Date.now() - daysAgo * 86_400_000),
  );
}

/**
 * One filter row above every report: the date range first, then the
 * dimension filters. Every filter narrows the dashboard to sessions that
 * match it. Page/property choices come from the current top-pages and
 * top-properties reports, so only values with data are offered.
 */
export function AnalyticsFiltersBar({
  value,
  onChange,
  pageOptions,
  propertyOptions,
}: {
  value: AnalyticsFilters;
  onChange: (next: AnalyticsFilters) => void;
  pageOptions: string[];
  propertyOptions: Array<{ id: number; title: string | null }>;
}) {
  const t = useTranslations("Analytics");
  const today = businessDate();
  const hasDimensionFilter = Boolean(
    value.source || value.device || value.page || value.propertyId || value.event || value.form,
  );

  function set<K extends keyof AnalyticsFilters>(key: K, next: AnalyticsFilters[K]) {
    onChange({ ...value, [key]: next });
  }

  function setRange(range: AnalyticsRange) {
    if (range === "custom") {
      const weekAgo = businessDate(6);
      onChange({ ...value, range, from: value.from ?? weekAgo, to: value.to ?? today });
    } else {
      onChange({ ...value, range });
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div role="group" aria-label={t("filters.range")} className="flex flex-wrap gap-1 rounded-md bg-surface-muted p-1">
          {RANGES.map((range) => (
            <button
              key={range}
              type="button"
              aria-pressed={value.range === range}
              onClick={() => setRange(range)}
              className={clsx(
                "rounded-sm px-3 py-1.5 text-sm font-semibold transition-colors",
                value.range === range ? "bg-gold-primary text-white shadow-sm" : "text-text-muted hover:text-text",
              )}
            >
              {t(`ranges.${range}`)}
            </button>
          ))}
        </div>

        {value.range === "custom" && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs font-bold text-text-muted">
              {t("filters.from")}
              <input
                type="date"
                max={value.to ?? today}
                value={value.from ?? ""}
                onChange={(event) => set("from", event.target.value)}
                className="rounded-sm border-[1.5px] border-border-strong bg-surface px-3 py-1.5 text-sm text-text"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-text-muted">
              {t("filters.to")}
              <input
                type="date"
                min={value.from}
                max={today}
                value={value.to ?? ""}
                onChange={(event) => set("to", event.target.value)}
                className="rounded-sm border-[1.5px] border-border-strong bg-surface px-3 py-1.5 text-sm text-text"
              />
            </label>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Select label={t("filters.source")} value={value.source ?? ""} onChange={(event) => set("source", event.target.value as AnalyticsFilters["source"])}>
          <option value="">{t("filters.all")}</option>
          {TRAFFIC_SOURCES.map((source) => (
            <option key={source} value={source}>{t(`sources.${source}`)}</option>
          ))}
        </Select>
        <Select label={t("filters.device")} value={value.device ?? ""} onChange={(event) => set("device", event.target.value as AnalyticsFilters["device"])}>
          <option value="">{t("filters.all")}</option>
          {DEVICE_TYPES.map((device) => (
            <option key={device} value={device}>{t(`devices.${device}`)}</option>
          ))}
        </Select>
        <Select label={t("filters.page")} value={value.page ?? ""} onChange={(event) => set("page", event.target.value)}>
          <option value="">{t("filters.all")}</option>
          {value.page && !pageOptions.includes(value.page) && <option value={value.page}>{value.page}</option>}
          {pageOptions.map((path) => (
            <option key={path} value={path}>{path}</option>
          ))}
        </Select>
        <Select label={t("filters.property")} value={value.propertyId ?? ""} onChange={(event) => set("propertyId", event.target.value)}>
          <option value="">{t("filters.all")}</option>
          {value.propertyId && !propertyOptions.some((option) => String(option.id) === value.propertyId) && (
            <option value={value.propertyId}>#{value.propertyId}</option>
          )}
          {propertyOptions.map((option) => (
            <option key={option.id} value={String(option.id)}>
              #{option.id} {option.title ?? ""}
            </option>
          ))}
        </Select>
        <Select label={t("filters.event")} value={value.event ?? ""} onChange={(event) => set("event", event.target.value as AnalyticsFilters["event"])}>
          <option value="">{t("filters.all")}</option>
          {REPORTABLE_EVENTS.map((type) => (
            <option key={type} value={type}>{t(`events.${type}`)}</option>
          ))}
        </Select>
        <Select label={t("filters.form")} value={value.form ?? ""} onChange={(event) => set("form", event.target.value as AnalyticsFilters["form"])}>
          <option value="">{t("filters.all")}</option>
          {TRACKED_FORMS.map((form) => (
            <option key={form} value={form}>{t(`forms.${form}`)}</option>
          ))}
        </Select>
      </div>

      {hasDimensionFilter && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[0.8rem] text-text-muted">
          <p>{t("filters.sessionHint")}</p>
          <button
            type="button"
            onClick={() => onChange({ range: value.range, from: value.from, to: value.to })}
            className="font-semibold text-gold-primary hover:underline"
          >
            {t("filters.reset")}
          </button>
        </div>
      )}
    </div>
  );
}
