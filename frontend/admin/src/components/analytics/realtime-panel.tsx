"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getRealtimeVisitors } from "@/lib/analytics-reports";
import type { DeviceType, RealtimeVisitors } from "@/types/analytics";
import { countryFlag, countryName, formatDuration, formatNumber } from "@/components/analytics/format";

/** Matches the tracker's heartbeat interval. Polling faster adds nothing. */
const POLL_MS = 30_000;

const DEVICE_ICONS: Record<DeviceType, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

/**
 * "Currently online": sessions with activity in the last
 * `window_seconds`. Polls only while this tab is visible, so an Admin
 * leaving the dashboard open in the background costs nothing.
 */
export function RealtimePanel() {
  const t = useTranslations("Analytics");
  const locale = useLocale();
  const [data, setData] = useState<RealtimeVisitors | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      if (document.visibilityState === "visible") {
        try {
          const result = await getRealtimeVisitors();
          if (!cancelled) {
            setData(result);
            setFailed(false);
          }
        } catch {
          if (!cancelled) setFailed(true);
        }
      }
      if (!cancelled) timer = setTimeout(load, POLL_MS);
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        if (timer) clearTimeout(timer);
        void load();
      }
    }

    void load();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
          </span>
          {t("realtime.title")}
        </p>
        {data && <p className="text-[0.75rem] text-text-muted">{t("realtime.window", { minutes: Math.round(data.window_seconds / 60) })}</p>}
      </div>

      {!data && !failed && <Skeleton className="h-16 w-full" />}
      {!data && failed && <p className="text-sm text-text-muted">{t("loadError")}</p>}

      {data && (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="shrink-0 lg:w-40">
            <p className="font-mono text-4xl font-semibold text-text tabular-nums">{formatNumber(data.visitors, locale)}</p>
            <p className="text-sm text-text-muted">{t("realtime.visitors", { count: data.visitors })}</p>
          </div>
          {data.items.length === 0 ? (
            <p className="text-sm text-text-muted">{t("realtime.empty")}</p>
          ) : (
            <ul className="grid min-w-0 flex-1 grid-cols-1 gap-2 md:grid-cols-2">
              {data.items.map((item) => {
                const Icon = DEVICE_ICONS[item.device_type] ?? Monitor;
                return (
                  <li key={item.id} className="flex min-w-0 items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
                    <Icon className="h-4 w-4 shrink-0 text-gold-primary" aria-label={t(`devices.${item.device_type}`)} />
                    <span className="min-w-0 flex-1 truncate font-mono text-[0.8rem] text-text" dir="ltr">
                      {item.current_path ?? "/"}
                    </span>
                    <span className="shrink-0 text-[0.75rem] text-text-muted">
                      <span title={countryName(item.country, locale)}>{countryFlag(item.country)}</span>{" "}
                      {t("realtime.ago", { time: formatDuration(item.seconds_since_activity, locale) })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
